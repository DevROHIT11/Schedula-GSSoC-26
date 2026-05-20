// Middleware: validateBooking
// Runs before the booking controller to catch obvious bad input early.
// The deep overlap check lives in bookingService (inside the transaction).

const { HttpError } = require('./error');

function validateBookingBody(req, _res, next) {
  const { service_id, start_datetime } = req.body;

  if (!service_id || isNaN(Number(service_id))) {
    return next(new HttpError(400, 'service_id must be a valid number'));
  }

  if (!start_datetime || typeof start_datetime !== 'string') {
    return next(new HttpError(400, 'start_datetime is required'));
  }

  const parsed = new Date(start_datetime.replace(' ', 'T'));
  if (isNaN(parsed.getTime())) {
    return next(new HttpError(400, 'start_datetime is not a valid date'));
  }

  if (parsed.getTime() < Date.now() - 60 * 1000) {
    return next(new HttpError(400, 'Cannot book a slot in the past'));
  }

  next();
}

module.exports = { validateBookingBody };