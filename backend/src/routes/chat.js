const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/chatController');
const { auth } = require('../middlewares/auth');

router.get('/history', auth, ah(c.history));
router.post('/send', auth, ah(c.send));

module.exports = router;
