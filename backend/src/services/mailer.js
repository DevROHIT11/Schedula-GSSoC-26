// Centralised mail sender.
// - Uses Brevo HTTP API when BREVO_API_KEY is set (works on hosts that block SMTP egress, e.g. Render Free).
// - Otherwise uses SMTP when SMTP_HOST is configured.
// - Falls back to Ethereal (a free dev SMTP) so emails are deliverable & previewable.
// - Falls back to console logging only when both above are unreachable.
//
// We intentionally never throw on send failures — auth/booking flows must not
// break if mail delivery is degraded.

const nodemailer = require('nodemailer');

// "Name <email@x>" or "email@x" → { name, email }
function parseFrom(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^["']|["']$/g, '').trim() || undefined, email: m[2].trim() };
  return { email: s };
}

function brevoApiTransport() {
  const apiKey = process.env.BREVO_API_KEY;
  return {
    sendMail: async (opts) => {
      const sender = parseFrom(opts.from);
      const body = {
        sender,
        to: [{ email: opts.to }],
        subject: opts.subject,
        htmlContent: opts.html || undefined,
        textContent: opts.text || undefined,
      };
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        const err = new Error(`Brevo API ${res.status}: ${text}`);
        err.code = `HTTP_${res.status}`;
        err.response = text;
        throw err;
      }
      let json = {};
      try { json = JSON.parse(text); } catch { /* ignore */ }
      return { messageId: json.messageId || `brevo-${Date.now()}` };
    },
  };
}

let transporterPromise = null;
let transportInfo = '';

function buildSmtpTransport() {
  const cfg = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  };
  console.log(`[mailer:debug] building transport host=${cfg.host} port=${cfg.port} secure=${cfg.secure} user=${cfg.auth?.user || '(none)'} passLen=${cfg.auth?.pass?.length || 0}`);
  return nodemailer.createTransport(cfg);
}

function consoleTransport() {
  return {
    sendMail: async (opts) => {
      console.log('========== [mailer:console] ==========');
      console.log('To:     ', opts.to);
      console.log('Subject:', opts.subject);
      console.log('Text:   ', opts.text || '(html only)');
      console.log('======================================');
      return { messageId: 'console-' + Date.now() };
    },
  };
}

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (process.env.BREVO_API_KEY) {
    transportInfo = 'Brevo HTTP API';
    console.log('[mailer:debug] using Brevo HTTP API');
    transporterPromise = Promise.resolve(brevoApiTransport());
    return transporterPromise;
  }

  if (process.env.SMTP_HOST) {
    transportInfo = `SMTP ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`;
    transporterPromise = Promise.resolve(buildSmtpTransport());
    return transporterPromise;
  }

  // Try Ethereal (creates an ephemeral test inbox; viewable via console-printed URL)
  transporterPromise = nodemailer.createTestAccount()
    .then((account) => {
      transportInfo = `Ethereal (${account.user})`;
      console.log(`[mailer] Using Ethereal test inbox: ${account.user}`);
      console.log(`[mailer] Open https://ethereal.email/login with the password printed below to inspect outgoing mail.`);
      console.log(`[mailer] Ethereal pass: ${account.pass}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass },
      });
    })
    .catch((e) => {
      transportInfo = `console-only (Ethereal unavailable: ${e.message})`;
      console.warn(`[mailer] ${transportInfo}`);
      return consoleTransport();
    });
  return transporterPromise;
}

async function sendMail({ to, subject, html, text }) {
  if (!to) return null;
  console.log(`[mailer:debug] sendMail called to=${to} subject="${subject}"`);
  try {
    console.log('[mailer:debug] awaiting getTransporter()...');
    const t = await getTransporter();
    console.log(`[mailer:debug] transporter ready (${transportInfo}); calling sendMail...`);
    const info = await t.sendMail({
      from: process.env.MAIL_FROM || 'Appointly <noreply@appointly.local>',
      to, subject, html, text,
    });
    if (info && info.messageId) {
      const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
      console.log(`[mailer] sent → ${to} via ${transportInfo} :: ${subject}` +
        (preview ? `  preview=${preview}` : ''));
    } else {
      console.log(`[mailer:debug] sendMail returned without messageId; info=${JSON.stringify(info)}`);
    }
    return info;
  } catch (e) {
    console.error('[mailer] send failed:', e.message);
    console.error('[mailer:debug] error code=', e.code, 'command=', e.command, 'response=', e.response);
    return null;
  }
}

module.exports = { sendMail };
