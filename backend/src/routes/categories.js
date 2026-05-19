const router = require('express').Router();
const ah = require('../utils/asyncHandler');
const c = require('../controllers/categoryController');

router.get('/', ah(c.list));

module.exports = router;
