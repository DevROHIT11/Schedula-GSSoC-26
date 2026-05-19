// Image uploads — stored as MEDIUMBLOB rows in `uploaded_images` so the
// database is the single source of truth (no writable filesystem needed).
// Public URL stays `/uploads/<filename>` to keep existing image_url values
// working transparently.

const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const multer  = require('multer');
const pool    = require('../config/db');
const { HttpError } = require('../middlewares/error');

// Disk fallback dir for legacy URLs uploaded before this migration.
const LEGACY_DIR = path.join(__dirname, '..', '..', 'uploads');

const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/;

const upload = multer({
  storage:    multer.memoryStorage(),       // ← bytes go to RAM, then DB
  limits:     { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.test(file.mimetype)) {
      return cb(new HttpError(400, 'Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

exports.middleware = upload.single('file');

// POST /api/uploads — accept the file, INSERT into uploaded_images.
exports.handle = async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  const ext = (path.extname(req.file.originalname || '') || '').toLowerCase();
  const safeExt = /^\.(png|jpe?g|webp|gif|svg)$/.test(ext) ? ext : '.png';
  const filename = `u${req.user?.id || 0}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}${safeExt}`;

  await pool.query(
    `INSERT INTO uploaded_images (filename, mime_type, size_bytes, data, uploaded_by)
     VALUES (?, ?, ?, ?, ?)`,
    [filename, req.file.mimetype, req.file.size, req.file.buffer, req.user?.id || null]
  );

  res.status(201).json({
    url: `/uploads/${filename}`,
    filename,
    size: req.file.size,
    mime_type: req.file.mimetype,
    storage: 'db',
  });
};

// GET /uploads/:filename — stream from DB, fall back to legacy disk.
// Mounted directly on the app (not under /api) so URLs like /uploads/x.png
// stay backwards-compatible with everything that already uses them.
exports.serve = async (req, res) => {
  const filename = String(req.params.filename || '');
  // Basic safety — only allow simple filenames.
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return res.status(400).send('Bad filename');

  try {
    const [rows] = await pool.query(
      'SELECT data, mime_type FROM uploaded_images WHERE filename=? LIMIT 1', [filename]);
    if (rows.length) {
      res.setHeader('Content-Type', rows[0].mime_type);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.end(rows[0].data);
    }
  } catch (e) {
    console.warn('[uploads] DB read failed, falling back to disk:', e.message);
  }

  // Legacy disk fallback for files written before the DB migration.
  try {
    const p = path.join(LEGACY_DIR, filename);
    if (fs.existsSync(p)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return res.sendFile(p);
    }
  } catch { /* ignore */ }

  res.status(404).send('Not found');
};
