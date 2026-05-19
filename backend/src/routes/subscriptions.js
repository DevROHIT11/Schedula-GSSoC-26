const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/subscriptionController');
const { auth } = require('../middlewares/auth');

router.get('/plans', ah(c.plans));
router.get('/mine', auth, ah(c.mine));
router.post('/subscribe', auth, ah(c.subscribe));
router.post('/cancel', auth, ah(c.cancel));

module.exports = router;
