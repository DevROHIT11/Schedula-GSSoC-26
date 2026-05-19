const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/masterController');

router.get('/countries', ah(c.countries));
router.get('/states',    ah(c.states));
router.get('/districts', ah(c.districts));
router.get('/cities',    ah(c.cities));

module.exports = router;
