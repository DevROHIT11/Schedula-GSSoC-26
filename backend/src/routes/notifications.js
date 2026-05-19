const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/notificationController');
const { auth } = require('../middlewares/auth');

router.get('/', auth, ah(c.list));
router.put('/:id/read', auth, ah(c.markRead));
router.put('/read-all', auth, ah(c.markAllRead));
router.delete('/:id', auth, ah(c.remove));
router.delete('/', auth, ah(c.removeAll));

module.exports = router;
