const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c  = require('../controllers/authController');
const { auth } = require('../middlewares/auth');

router.post('/register',  ah(c.register));
router.post('/verify-otp', ah(c.verifyOtp));
router.post('/resend-otp', ah(c.resendOtp));
router.post('/login',     ah(c.login));
router.post('/forgot',    ah(c.forgot));
router.post('/reset',     ah(c.reset));
router.get('/me',         auth, ah(c.me));
router.put('/me',         auth, ah(c.updateMe));
router.post('/phone/send-otp',   auth, ah(c.sendPhoneOtp));
router.post('/phone/verify-otp', auth, ah(c.verifyPhoneOtp));

module.exports = router;
