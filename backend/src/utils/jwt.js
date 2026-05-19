const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev_secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
const verify = (token) => jwt.verify(token, SECRET);

module.exports = { sign, verify };
