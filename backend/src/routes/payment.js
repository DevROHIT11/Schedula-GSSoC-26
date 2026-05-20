const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const { auth } = require('../middlewares/auth');
const c = require('../controllers/paymentController');

router.get('/config',           ah(c.config));
router.post('/create-order',    auth, ah(c.createOrder));
router.post('/verify',          auth, ah(c.verify));
router.post('/fail',            auth, ah(c.fail));
router.post('/upi-confirm',     auth, ah(c.confirmUpi));


router.post('/create-subscription-order', auth, ah(c.createSubscriptionOrder));
router.post('/verify-subscription',       auth, ah(c.verifySubscription));
router.post('/upi-confirm-subscription',  auth, ah(c.confirmUpiSubscription));

module.exports = router;
