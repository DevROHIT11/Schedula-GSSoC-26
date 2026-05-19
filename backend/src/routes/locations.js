const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/locationController');

router.get('/', ah(c.tree));
router.get('/nearest', ah(c.nearest));
router.get('/search', ah(c.search));

module.exports = router;
