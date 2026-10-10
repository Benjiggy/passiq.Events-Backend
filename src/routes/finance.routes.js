const express = require('express');
const router = express.Router();
const FinanceController = require('../controllers/finance.controller');
const { authenticateToken, requireHostOrAdmin } = require('../middlewares/auth.middleware');

router.get('/balance', authenticateToken, requireHostOrAdmin, FinanceController.getBalance);
router.post('/payout-account', authenticateToken, requireHostOrAdmin, FinanceController.savePayoutAccount);

module.exports = router;
