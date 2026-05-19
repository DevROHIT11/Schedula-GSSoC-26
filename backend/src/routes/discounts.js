const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/discountController');
const { auth, requireRole } = require('../middlewares/auth');

router.get('/', ah(c.list));
router.post('/validate', auth, ah(c.validate));
router.post('/', auth, requireRole('admin','organiser'), ah(c.create));

module.exports = router;
