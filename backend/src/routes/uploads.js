const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const { auth } = require('../middlewares/auth');
const c = require('../controllers/uploadController');

router.post('/', auth, c.middleware, ah(c.handle));

module.exports = router;
