const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/creditController');
const { auth, requireRole } = require('../middlewares/auth');

router.get('/me', auth, ah(c.balance));
router.post('/grant', auth, requireRole('admin'), ah(c.grant));

module.exports = router;
