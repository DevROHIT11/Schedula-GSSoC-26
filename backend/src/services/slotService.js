// Real-time slot availability calculator
// Builds candidate slots from weekly_schedules OR availability_slots,
// honoring buffer time, calendar-blocked dates, premium-only blocks, and
// per-resource capacity already taken by confirmed/reserved bookings.

const pool = require('../config/db');

const pad = (n) => String(n).padStart(2, '0');

const toMysqlLocal = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const parseTime = (t) => {
  const [h, m, s] = t.split(':').map(Number);
  return { h, m, s: s || 0 };
};

const buildWeeklySlots = (date, schedules, durationMinutes, bufferMinutes) => {
  const dow = date.getDay();
  const todays = schedules.filter((s) => Number(s.day_of_week) === dow);
  const slots = [];
  const stride = (durationMinutes + bufferMinutes) * 60000;
  for (const win of todays) {
    const a = parseTime(win.start_time);
    const b = parseTime(win.end_time);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), a.h, a.m, a.s);
    const end   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), b.h, b.m, b.s);
    let cur = new Date(start.getTime());
    while (cur.getTime() + durationMinutes * 60000 <= end.getTime()) {
      slots.push({ start: new Date(cur.getTime()), end: new Date(cur.getTime() + durationMinutes * 60000) });
      cur = new Date(cur.getTime() + stride);
    }
  }
  return slots;
};

const buildFlexibleSlots = (date, flexSlots, durationMinutes, bufferMinutes) => {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd   = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  const slots = [];
  const stride = (durationMinutes + bufferMinutes) * 60000;
  for (const win of flexSlots) {
    const start = new Date(win.start_datetime.replace(' ', 'T'));
    const end   = new Date(win.end_datetime.replace(' ', 'T'));
    if (end <= dayStart || start >= dayEnd) continue;
    const winStart = start < dayStart ? dayStart : start;
    const winEnd   = end   > dayEnd   ? dayEnd   : end;
    let cur = new Date(winStart.getTime());
    while (cur.getTime() + durationMinutes * 60000 <= winEnd.getTime()) {
      slots.push({ start: new Date(cur.getTime()), end: new Date(cur.getTime() + durationMinutes * 60000) });
      cur = new Date(cur.getTime() + stride);
    }
  }
  return slots;
};

async function getAvailableSlots({ serviceId, date, resourceId = null, conn = null, userPriority = 0 }) {
  const c = conn || pool;
  const [serviceRows] = await c.query('SELECT * FROM services WHERE id=?', [serviceId]);
  if (!serviceRows.length) throw new Error('Service not found');
  const service = serviceRows[0];

  // Hide unpublished or deleted services from slot generation entirely.
  if (service.is_deleted || !service.is_published) return [];

  // Plan-tier early-visibility: Silver users (priority 0) only see the next 14
  // days. Gold (1) sees 30 days, Platinum (2) and above see everything.
  const horizonDays = userPriority >= 2 ? 365 : userPriority >= 1 ? 30 : 14;
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const horizon = new Date(today0.getTime() + horizonDays * 24 * 3600 * 1000);
  if (date.getTime() > horizon.getTime()) return [];

  const dateOnlyStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const [blocks] = await c.query(
    `SELECT id FROM calendar_notes
      WHERE note_date=? AND is_blocked=1 AND (service_id IS NULL OR service_id=?)`,
    [dateOnlyStr, serviceId]);
  if (blocks.length) return [];

  const [resources] = await c.query(
    'SELECT id, name FROM resources WHERE service_id=? AND is_active=1' +
    (resourceId ? ' AND id=?' : ''),
    resourceId ? [serviceId, resourceId] : [serviceId]
  );
  if (!resources.length) return [];

  const buffer = Number(service.buffer_minutes || 0);
  let baseSlots = [];
  if (service.schedule_type === 'weekly') {
    const [ws] = await c.query('SELECT * FROM weekly_schedules WHERE service_id=?', [serviceId]);
    baseSlots = buildWeeklySlots(date, ws, service.duration_minutes, buffer);
  } else {
    const [fs] = await c.query('SELECT * FROM availability_slots WHERE service_id=?', [serviceId]);
    baseSlots = buildFlexibleSlots(date, fs, service.duration_minutes, buffer);
  }
  if (!baseSlots.length) return [];

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd   = new Date(dayStart.getTime() + 24 * 3600 * 1000);

  const resourceIds = resources.map((r) => r.id);
  const [bookings] = await c.query(
    `SELECT resource_id, start_datetime, end_datetime, capacity_taken, status
       FROM bookings
      WHERE resource_id IN (?)
        AND status IN ('reserved','pending','confirmed')
        AND start_datetime >= ? AND start_datetime < ?`,
    [resourceIds, toMysqlLocal(dayStart), toMysqlLocal(dayEnd)]
  );

  const [blockRows] = await c.query(
    `SELECT resource_id, start_datetime, min_priority_level
       FROM blocked_slots
      WHERE service_id=? AND start_datetime >= ? AND start_datetime < ?`,
    [serviceId, toMysqlLocal(dayStart), toMysqlLocal(dayEnd)]);

  const takenByResource = {};
  for (const r of resources) takenByResource[r.id] = {};
  for (const b of bookings) {
    const key = b.start_datetime;
    takenByResource[b.resource_id][key] =
      (takenByResource[b.resource_id][key] || 0) + Number(b.capacity_taken);
  }
  // (resource_id|null) + start key → required priority
  const blockMap = {};
  for (const b of blockRows) {
    const k = `${b.resource_id || 'all'}|${b.start_datetime}`;
    blockMap[k] = Math.max(Number(b.min_priority_level), blockMap[k] || 0);
  }

  const cap = service.manage_capacity ? Number(service.max_per_slot) : 1;
  const nowMs = Date.now();

  const result = [];
  for (const slot of baseSlots) {
    const key = toMysqlLocal(slot.start);
    if (slot.start.getTime() < nowMs) continue;          // prune past
    let remainingTotal = 0;
    let pickedResource = null;
    let pickedRemaining = 0;
    let lockTier = 0;
    for (const r of resources) {
      const used = takenByResource[r.id][key] || 0;
      const rem  = Math.max(0, cap - used);
      const tier = Math.max(blockMap[`${r.id}|${key}`] || 0, blockMap[`all|${key}`] || 0);
      if (tier > userPriority) continue;                 // user can't access this resource for this slot
      lockTier = Math.max(lockTier, tier);
      remainingTotal += rem;
      if (rem > pickedRemaining) {
        pickedRemaining = rem;
        pickedResource = r;
      }
    }
    // Compute the "anyone-can-see-this-locked" tier so frontend can label the slot.
    let serviceTier = blockMap[`all|${key}`] || 0;
    for (const r of resources) {
      serviceTier = Math.max(serviceTier, blockMap[`${r.id}|${key}`] || 0);
    }
    const fullyLocked = serviceTier > userPriority;
    result.push({
      start: key,
      end: toMysqlLocal(slot.end),
      capacity_total: cap * resources.length,
      capacity_remaining: remainingTotal,
      suggested_resource_id: pickedResource ? pickedResource.id : null,
      suggested_resource_name: pickedResource ? pickedResource.name : null,
      available: !fullyLocked && remainingTotal > 0,
      requires_priority: serviceTier,            // 0=open, 1=Gold, 2=Platinum
      locked: fullyLocked,
    });
  }

  return result;
}

module.exports = { getAvailableSlots, toMysqlLocal };
