const pool = require('../config/db');
const { HttpError } = require('../middlewares/error');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Optional OpenAI passthrough — only used when OPENAI_API_KEY is set.
// Keeps the existing rule-based fallback fully working when the key is
// missing, rate-limited, or returns an error.
async function askOpenAI(userText, context) {
  if (!OPENAI_KEY) return null;
  const sys = `You are Schedula Assistant, a friendly helper inside an
appointment-booking platform. Answer in 2-4 short sentences, plain text only.
The user has ${context.credits} credits${context.plan ? ` and is on the ${context.plan.name} plan` : ''}.
${context.upcoming.length ? `Upcoming bookings: ${context.upcoming.map((b) => b.service_name + ' on ' + b.start_datetime).join('; ')}.` : 'No upcoming bookings.'}
If asked something outside the scope of bookings/services/payments, gently redirect.`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user',   content: userText.slice(0, 500) },
        ],
        max_tokens: 220,
        temperature: 0.4,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.warn('[chat] openai returned', res.status);
      return null;
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.warn('[chat] openai failed:', e.message);
    return null;
  }
}

// Lightweight intent-routing assistant. Pulls live data from the database so
// answers stay grounded in the current catalogue, the user's bookings, and
// their wallet/credit state.
const INR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

async function userContext(userId) {
  const [[creds]] = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS bal FROM credit_transactions
      WHERE user_id=? AND (expires_at IS NULL OR expires_at > NOW())`, [userId]);
  const [sub] = await pool.query(
    `SELECT p.\`key\`, p.name, p.priority_level FROM user_subscriptions us
       JOIN subscription_plans p ON p.id=us.plan_id
      WHERE us.user_id=? AND us.status='active' AND us.expires_at > NOW()
      ORDER BY p.priority_level DESC LIMIT 1`, [userId]);
  const [upcoming] = await pool.query(
    `SELECT b.id, b.start_datetime, b.status, s.name AS service_name
       FROM bookings b JOIN services s ON s.id=b.service_id
      WHERE b.customer_id=? AND b.start_datetime > NOW() AND b.status<>'cancelled'
      ORDER BY b.start_datetime LIMIT 3`, [userId]);
  return {
    credits: Number(creds.bal) || 0,
    plan: sub[0] || null,
    upcoming,
  };
}

async function topServices(category) {
  const args = [];
  let where = 's.is_published=1';
  if (category) { where += ' AND c.`key`=?'; args.push(category); }
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.price, s.duration_minutes, s.appointment_type,
            s.city, c.name AS category
       FROM services s LEFT JOIN service_categories c ON c.id=s.category_id
      WHERE ${where}
      ORDER BY s.rating DESC, s.id DESC LIMIT 5`, args);
  return rows;
}

function intent(t) {
  if (/^(hi|hii|hello|hey|hola|namaste|ola)\b/.test(t)) return 'greet';
  if (/(thank|thanks|thx)/.test(t)) return 'thanks';
  if (/(cancel|refund)/.test(t)) return 'cancel';
  if (/(reschedul|move|change.*time|change.*date)/.test(t)) return 'reschedule';
  if (/(payment|pay|upi|gpay|google pay|card|invoice)/.test(t)) return 'payment';
  if (/(plan|subscription|silver|gold|platinum|vip|upgrade)/.test(t)) return 'plan';
  if (/(credit|coin|reward|wallet)/.test(t)) return 'credit';
  if (/(virtual|online|video|meet|zoom|gmeet|google meet)/.test(t)) return 'virtual';
  if (/(near me|location|city|state|district|country)/.test(t)) return 'location';
  if (/(my booking|my appointment|upcoming|next appointment)/.test(t)) return 'mine';
  if (/(\bhealth|doctor|dentist|dental|medical|clinic|hospital|therapy|counsel|psych)/.test(t)) return 'cat:healthcare';
  if (/(sport|gym|fitness|yoga|trainer|workout|crossfit)/.test(t)) return 'cat:sports';
  if (/(counsel|therap|mental|stress|anxiety|psych)/.test(t)) return 'cat:counseling';
  if (/(event|studio|photo|shoot|venue)/.test(t)) return 'cat:events';
  if (/(interview|career|job|mock|coach)/.test(t)) return 'cat:interviews';
  if (/(salon|beauty|hair|massage|repair|servic)/.test(t)) return 'cat:services';
  if (/(book|appointment|service|slot|find)/.test(t)) return 'browse';
  if (/(help|how|what.*can you|guide|support)/.test(t)) return 'help';
  return null;
}

async function reply(userId, text) {
  const t = text.toLowerCase().trim();
  const ctx = await userContext(userId);
  const i = intent(t);

  switch (i) {
    case 'greet': {
      const greet = ctx.plan
        ? `Hi! You're on the ${ctx.plan.name} plan with ${ctx.credits} credits available. How can I help today?`
        : `Hi! I'm Schedula Assistant. I can help with services, bookings, payments, plans, and credits.`;
      return greet;
    }
    case 'thanks':
      return `Anytime! Anything else?`;
    case 'cancel':
      return `To cancel: open Profile → Upcoming → Cancel. Paid bookings get the full amount refunded; any credits you used are returned to your wallet immediately.`;
    case 'reschedule':
      return `Open Profile → Upcoming → Reschedule. Pick a new date in the calendar and a free slot — your booking is moved instantly. Gold/Platinum members can reschedule for free.`;
    case 'payment':
      return `We accept Cards (Visa/Master/Rupay), UPI, and Google Pay. Bookings that need advance payment are reserved while you complete payment, then auto-confirmed.`;
    case 'plan': {
      const cur = ctx.plan ? `You're on **${ctx.plan.name}**.` : `You don't have an active plan.`;
      return `${cur}\n• Silver — free, standard booking\n• Gold — ₹299/mo, priority slots, 2× credits, free reschedule\n• Platinum — ₹799/mo, VIP slots, 5× credits, dedicated support\nUpgrade anytime from Plans.`;
    }
    case 'credit':
      return `You have **${ctx.credits} credits** (1 credit = ₹1 off). Earn 5% back on every paid booking. Gold earns 2× and Platinum earns 5×. Credits expire 90 days from issue.`;
    case 'virtual': {
      const [v] = await pool.query(
        `SELECT name, virtual_provider FROM services
          WHERE is_published=1 AND appointment_type IN ('virtual','hybrid')
          ORDER BY rating DESC LIMIT 4`);
      const list = v.map((x) => `• ${x.name} (${x.virtual_provider.replace('_', ' ')})`).join('\n');
      return `Virtual appointments include the meeting link in your confirmation. Top virtual services right now:\n${list || '— none published yet —'}`;
    }
    case 'location':
      return `Use the location filter on Discover (Country → State → City) to see providers near you. Your saved city is used for recommendations.`;
    case 'mine': {
      if (!ctx.upcoming.length) return `You have no upcoming appointments. Open Discover to find one!`;
      const list = ctx.upcoming.map((b) => `• ${b.service_name} — ${b.start_datetime.replace('T', ' ')} (${b.status})`).join('\n');
      return `Your next ${ctx.upcoming.length} appointment(s):\n${list}`;
    }
    case 'help':
      return `I can help with:\n• Finding services (by category, city, or keyword)\n• Booking, rescheduling, cancelling\n• Plans (Silver / Gold / Platinum) and credits\n• Payments (Card / UPI / GPay)\n• Virtual meeting access\nAsk anything!`;
    case 'browse': {
      const services = await topServices();
      if (!services.length) return `No services published yet — please check back soon.`;
      const list = services.map((s) => `• ${s.name}${s.category ? ` (${s.category})` : ''} — ${s.duration_minutes} min · ${INR(s.price)}${s.appointment_type === 'virtual' ? ' · Virtual' : ''}`).join('\n');
      return `Top picks right now:\n${list}\n\nOpen Discover and tap any card to start booking.`;
    }
    default:
      if (i && i.startsWith('cat:')) {
        const cat = i.slice(4);
        const services = await topServices(cat);
        if (!services.length) return `No services in that category yet — try another!`;
        const list = services.map((s) => `• ${s.name} — ${INR(s.price)} · ${s.duration_minutes} min${s.city ? ` · ${s.city}` : ''}`).join('\n');
        return `Top in ${cat}:\n${list}\n\nFilter Discover by ${cat[0].toUpperCase() + cat.slice(1)} to see all.`;
      }
      return `I'm not sure I caught that. Try asking about: services, bookings, payments, plans, credits, my upcoming appointments, virtual meetings, or "find healthcare in Pune".`;
  }
}

exports.history = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, role, text, created_at FROM chat_messages WHERE user_id=? ORDER BY id DESC LIMIT 50',
    [req.user.id]);
  res.json({ messages: rows.reverse() });
};

exports.send = async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) throw new HttpError(400, 'text required');
  if (text.length > 500) throw new HttpError(400, 'message too long (max 500 chars)');
  await pool.query("INSERT INTO chat_messages (user_id, role, text) VALUES (?, 'user', ?)",
    [req.user.id, text]);

  // 1) Try OpenAI when configured. 2) Fall back to deterministic rule-based.
  let answer = null;
  if (OPENAI_KEY) {
    const ctx = await userContext(req.user.id);
    answer = await askOpenAI(text, ctx);
  }
  if (!answer) answer = await reply(req.user.id, text);

  await pool.query("INSERT INTO chat_messages (user_id, role, text) VALUES (?, 'assistant', ?)",
    [req.user.id, answer]);
  res.json({ reply: answer, source: OPENAI_KEY && answer ? 'ai' : 'rules' });
};
