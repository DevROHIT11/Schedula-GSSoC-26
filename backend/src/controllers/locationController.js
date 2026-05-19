const pool = require('../config/db');

// Crude offline reverse-geocode — picks the seeded city whose coords are
// closest to the supplied lat/lng. Good enough for hackathon demos and
// requires no external API key.
const CITY_COORDS = [
  { country: 'India', state: 'Maharashtra', district: 'Pune',      city: 'Pune',             lat: 18.5204, lng: 73.8567 },
  { country: 'India', state: 'Maharashtra', district: 'Mumbai',    city: 'Mumbai',           lat: 19.0760, lng: 72.8777 },
  { country: 'India', state: 'Maharashtra', district: 'Mumbai',    city: 'Navi Mumbai',      lat: 19.0330, lng: 73.0297 },
  { country: 'India', state: 'Maharashtra', district: 'Pune',      city: 'Pimpri-Chinchwad', lat: 18.6298, lng: 73.7997 },
  { country: 'India', state: 'Maharashtra', district: 'Nagpur',    city: 'Nagpur',           lat: 21.1458, lng: 79.0882 },
  { country: 'India', state: 'Karnataka',   district: 'Bengaluru', city: 'Bengaluru',        lat: 12.9716, lng: 77.5946 },
  { country: 'India', state: 'Karnataka',   district: 'Bengaluru', city: 'Whitefield',       lat: 12.9698, lng: 77.7500 },
  { country: 'India', state: 'Karnataka',   district: 'Mysuru',    city: 'Mysuru',           lat: 12.2958, lng: 76.6394 },
  { country: 'India', state: 'Tamil Nadu',  district: 'Chennai',   city: 'Chennai',          lat: 13.0827, lng: 80.2707 },
  { country: 'India', state: 'Tamil Nadu',  district: 'Coimbatore',city: 'Coimbatore',       lat: 11.0168, lng: 76.9558 },
  { country: 'India', state: 'Delhi',       district: 'New Delhi', city: 'New Delhi',        lat: 28.6139, lng: 77.2090 },
  { country: 'India', state: 'Delhi',       district: 'New Delhi', city: 'Dwarka',           lat: 28.5921, lng: 77.0460 },
  { country: 'India', state: 'Gujarat',     district: 'Ahmedabad', city: 'Ahmedabad',        lat: 23.0225, lng: 72.5714 },
  { country: 'India', state: 'Gujarat',     district: 'Surat',     city: 'Surat',            lat: 21.1702, lng: 72.8311 },
  { country: 'India', state: 'Telangana',   district: 'Hyderabad', city: 'Hyderabad',        lat: 17.3850, lng: 78.4867 },
  { country: 'India', state: 'Telangana',   district: 'Hyderabad', city: 'Secunderabad',     lat: 17.4399, lng: 78.4983 },
];

const haversine = (a, b) => {
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

exports.tree = async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT country, state, district, city FROM locations ORDER BY country, state, district, city');
  const tree = {};
  for (const r of rows) {
    tree[r.country] = tree[r.country] || {};
    tree[r.country][r.state] = tree[r.country][r.state] || {};
    tree[r.country][r.state][r.district] = tree[r.country][r.state][r.district] || [];
    tree[r.country][r.state][r.district].push(r.city);
  }
  res.json({ tree });
};

exports.nearest = async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ message: 'lat & lng query params required' });
  }
  const me = { lat, lng };
  let best = null, bestD = Infinity;
  for (const c of CITY_COORDS) {
    const d = haversine(me, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  res.json({ ...best, distance_km: Math.round(bestD * 10) / 10 });
};

exports.search = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ results: [] });
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT DISTINCT country, state, district, city
       FROM locations
      WHERE country LIKE ? OR state LIKE ? OR district LIKE ? OR city LIKE ?
      LIMIT 20`,
    [like, like, like, like]);
  res.json({ results: rows });
};
