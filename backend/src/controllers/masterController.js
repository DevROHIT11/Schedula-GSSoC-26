// Master location data — full Country → State → District → City hierarchy
// for service creation. Independent of the `locations` table (which only has
// rows for actual seeded services).

const { COUNTRIES, listStates, listDistricts, listCities } = require('../data/indiaLocations');

exports.countries = (_req, res) => {
  res.json({ countries: COUNTRIES });
};

exports.states = (req, res) => {
  const country = String(req.query.country || 'India');
  res.json({ country, states: listStates(country) });
};

exports.districts = (req, res) => {
  const country = String(req.query.country || 'India');
  const state = String(req.query.state || '');
  if (!state) return res.json({ districts: [] });
  res.json({ country, state, districts: listDistricts(country, state) });
};

exports.cities = (req, res) => {
  const country = String(req.query.country || 'India');
  const state = String(req.query.state || '');
  const district = String(req.query.district || '');
  if (!district) return res.json({ cities: [] });
  res.json({ country, state, district, cities: listCities(country, state, district) });
};
