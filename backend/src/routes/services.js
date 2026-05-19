const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c  = require('../controllers/serviceController');
const { auth, optionalAuth, requireRole } = require('../middlewares/auth');

// Public listing & detail
router.get('/',                       ah(c.listPublic));
router.get('/search',                 ah(c.search));
router.get('/recommended', optionalAuth, ah(c.recommended));
router.get('/reviews/mine', auth,     ah(c.myReviews));
router.get('/share/:token',           ah(c.byShareToken));
router.get('/:id',          optionalAuth, ah(c.getOne));
router.get('/:id/slots',    optionalAuth, ah(c.getSlots));
router.post('/:id/review',  auth, ah(c.review));

// Organiser endpoints
router.get('/mine/list',    auth, requireRole('organiser','admin'), ah(c.listMine));
router.post('/',            auth, requireRole('organiser','admin'), ah(c.create));
router.put('/:id',          auth, requireRole('organiser','admin'), ah(c.update));
router.delete('/:id',       auth, requireRole('organiser','admin'), ah(c.softDelete));
router.put('/:id/publish',  auth, requireRole('organiser','admin'), ah(c.publish));
router.post('/:id/resources', auth, requireRole('organiser','admin'), ah(c.addResource));
router.delete('/:id/resources/:rid', auth, requireRole('organiser','admin'), ah(c.deleteResource));
router.put('/:id/weekly',   auth, requireRole('organiser','admin'), ah(c.setWeekly));
router.put('/:id/flexible', auth, requireRole('organiser','admin'), ah(c.setFlexible));
router.put('/:id/questions',auth, requireRole('organiser','admin'), ah(c.setQuestions));
router.put('/:id/calendar-notes', auth, requireRole('organiser','admin'), ah(c.setCalendarNotes));
router.get('/:id/calendar', auth, requireRole('organiser','admin'), ah(c.calendar));
router.get('/:id/bookings', auth, requireRole('organiser','admin'), ah(c.serviceBookings));

module.exports = router;
