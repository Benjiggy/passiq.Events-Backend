const express = require('express');
const router = express.Router();
const DiscountController = require('../controllers/discount.controller');
const { authenticateToken, requireHostOrAdmin, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/', authenticateToken, requireHostOrAdmin, DiscountController.listDiscounts);
router.post('/', authenticateToken, requireHostOrAdmin, DiscountController.createDiscount);
router.post('/validate', optionalAuth, DiscountController.validateDiscount);

module.exports = router;
