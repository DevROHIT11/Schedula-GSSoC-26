// Small utilities to generate iCal content and Google Calendar links
function toICalDate(mysqlDt) {
  const d = new Date(String(mysqlDt).replace(' ', 'T'));
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function generateICalString(b) {
  const uid = `booking-${b.id}@schedula.app`;
  const dtstamp = toICalDate(new Date().toISOString());
  const dtstart = toICalDate(b.start_datetime);
  const dtend = toICalDate(b.end_datetime);
  const title = `${b.service_name} with ${b.resource_name}`;
  const location = b.appointment_type === 'virtual' ? (b.meeting_link || 'Online') : (b.venue || '');
  const descLines = [
    `Booking ID: ${b.id}`,
    `Service: ${b.service_name}`,
    `Provider: ${b.resource_name}`,
    b.meeting_link ? `Join: ${b.meeting_link}` : '',
  ].filter(Boolean);
  const description = descLines.join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Schedula//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT1H',
    'DESCRIPTION:Reminder: Your appointment is in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function escapeText(s) {
  return String(s || '').replace(/\\n/g, '\\n').replace(/\r/g, '').replace(/,/g, '\\,');
}

export function downloadICalFile(b) {
  const ics = generateICalString(b);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedula-booking-${b.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function getGoogleCalendarLink(b) {
  const fmt = (mysqlDt) => {
    const d = new Date(String(mysqlDt).replace(' ', 'T'));
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  };
  const dates = `${fmt(b.start_datetime)}/${fmt(b.end_datetime)}`;
  const title = `${b.service_name} with ${b.resource_name}`;
  const location = b.appointment_type === 'virtual' ? (b.meeting_link || 'Online') : (b.venue || '');
  const details = [
    `Booking ID: ${b.id}`,
    `Service: ${b.service_name}`,
    b.meeting_link ? `Join: ${b.meeting_link}` : '',
  ].filter(Boolean).join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default { generateICalString, downloadICalFile, getGoogleCalendarLink };
