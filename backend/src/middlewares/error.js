// Centralised error handler
module.exports = (err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (status >= 500) console.error('[ERROR]', err);
  res.status(status).json({ message, details: err.details });
};

module.exports.HttpError = class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
};
