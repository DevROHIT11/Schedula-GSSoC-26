const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c  = require('../controllers/adminController');
const { auth, requireRole } = require('../middlewares/auth');

router.get('/dashboard',     auth, requireRole('admin'), ah(c.dashboard));
router.get('/users',         auth, requireRole('admin'), ah(c.allUsers));
router.put('/users/:id/active', auth, requireRole('admin'), ah(c.setActive));
router.put('/users/:id/role',   auth, requireRole('admin'), ah(c.setRole));
router.get('/reviews',       auth, requireRole('admin'), ah(c.allReviews));
router.get('/reports',       auth, requireRole('admin','organiser'), ah(c.reports));

module.exports = router;
