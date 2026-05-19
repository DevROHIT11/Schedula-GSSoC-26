// HTML email templates. Kept inline so we have no template-engine dependency.

const wrap = (innerHtml) => `
<div style="background:#f1f5f9; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
    <div style="padding:18px 24px; background:linear-gradient(135deg,#6366f1,#a855f7); color:#fff; font-weight:700; font-size:18px;">
      Appointly
    </div>
    <div style="padding:24px 28px; color:#0f172a; font-size:14px; line-height:1.55;">
      ${innerHtml}
    </div>
    <div style="padding:14px 24px; background:#f8fafc; color:#94a3b8; font-size:12px; text-align:center;">
      You're receiving this because you have an Appointly account.
    </div>
  </div>
</div>`;

function otpEmail({ name, otp, purpose = 'verify' }) {
  const heading = purpose === 'verify' ? 'Verify your account' : 'Your one-time code';
  return {
    subject: `Your Appointly verification code: ${otp}`,
    text: `Hi ${name || 'there'}, your Appointly verification code is ${otp}. It expires in 5 minutes.`,
    html: wrap(`
      <h2 style="margin:0 0 8px; color:#0f172a;">${heading}</h2>
      <p style="color:#475569;">Hi ${name || 'there'}, use the code below to ${purpose === 'verify' ? 'verify your account' : 'continue'}.</p>
      <div style="font-size:30px; letter-spacing:10px; font-weight:800; text-align:center; padding:18px;
                  background:#eef2ff; color:#4338ca; border-radius:10px; margin:18px 0;">
        ${otp}
      </div>
      <p style="color:#64748b; font-size:13px; margin:0;">This code expires in <b>5 minutes</b>. If you didn't request it, you can safely ignore this email.</p>
    `),
  };
}

function resetEmail({ name, token, email, resetUrl }) {
  return {
    subject: 'Reset your Appointly password',
    text: `Hi ${name || 'there'}, use this token to reset your password: ${token} (expires in 30 minutes).`,
    html: wrap(`
      <h2 style="margin:0 0 8px;">Reset your password</h2>
      <p style="color:#475569;">Hi ${name || 'there'}, we received a request to reset your password.</p>
      <p style="margin:14px 0;">
        <a href="${resetUrl}" style="display:inline-block; background:#6366f1; color:#fff; text-decoration:none;
                                       padding:12px 22px; border-radius:10px; font-weight:600;">
          Reset password
        </a>
      </p>
      <p style="color:#64748b; font-size:13px;">Or use this token in the reset form (expires in 30 minutes):</p>
      <code style="display:block; background:#f8fafc; padding:10px; border-radius:8px; word-break:break-all; color:#1e293b;">${token}</code>
      <p style="color:#94a3b8; font-size:12px; margin-top:18px;">If you didn't request this, you can ignore this email — your password won't change.</p>
    `),
  };
}

const fmtWhen = (s) => {
  try {
    return new Date(s.replace(' ', 'T')).toLocaleString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return s; }
};

const statusLine = (status) => {
  if (status === 'confirmed') return '<span style="color:#047857; font-weight:700;">Confirmed ✓</span>';
  if (status === 'reserved')  return '<span style="color:#b45309; font-weight:700;">Reserved (awaiting organiser confirmation)</span>';
  if (status === 'pending')   return '<span style="color:#b45309; font-weight:700;">Awaiting payment</span>';
  if (status === 'cancelled') return '<span style="color:#b91c1c; font-weight:700;">Cancelled</span>';
  return status;
};

function bookingEmail({ name, action, service_name, when, end, provider, status, venue, total }) {
  const headlines = {
    created:     'Your appointment is booked',
    confirmed:   'Your appointment is confirmed',
    rescheduled: 'Your appointment was rescheduled',
    cancelled:   'Your appointment was cancelled',
  };
  const headline = headlines[action] || 'Appointment update';

  const detailRow = (label, value) => `
    <tr>
      <td style="padding:8px 0; color:#64748b; font-size:13px; width:140px;">${label}</td>
      <td style="padding:8px 0; color:#0f172a; font-weight:600;">${value}</td>
    </tr>`;

  return {
    subject: `[Appointly] ${headline} — ${service_name}`,
    text:
`Hi ${name || 'there'},
${headline}.

Service:  ${service_name}
When:     ${fmtWhen(when)}${end ? ' → ' + fmtWhen(end) : ''}
Provider: ${provider}
Venue:    ${venue || '—'}
Status:   ${status}
${total ? 'Total:    ₹' + Number(total).toFixed(2) : ''}
`,
    html: wrap(`
      <h2 style="margin:0 0 8px;">${headline}</h2>
      <p style="color:#475569;">Hi ${name || 'there'}, here are the details:</p>
      <table style="width:100%; border-collapse:collapse; margin:14px 0;">
        ${detailRow('Service',  service_name)}
        ${detailRow('When',     fmtWhen(when))}
        ${detailRow('Provider', provider)}
        ${detailRow('Venue',    venue || '—')}
        ${detailRow('Status',   statusLine(status))}
        ${total ? detailRow('Total', '₹' + Number(total).toFixed(2)) : ''}
      </table>
      <p style="color:#64748b; font-size:13px;">You can manage your booking from your Appointly profile.</p>
    `),
  };
}

module.exports = { otpEmail, resetEmail, bookingEmail };
