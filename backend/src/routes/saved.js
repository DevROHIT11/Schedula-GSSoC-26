const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const { auth } = require('../middlewares/auth');
const c = require('../controllers/savedController');

router.get('/',         auth, ah(c.list));
router.get('/ids',      auth, ah(c.ids));
router.post('/:id',     auth, ah(c.add));
router.delete('/:id',   auth, ah(c.remove));

module.exports = router;
