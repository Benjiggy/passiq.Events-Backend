const express = require('express');
const router = express.Router();
const WithdrawalController = require('../controllers/withdrawal.controller');
const { authenticateToken, requireHostOrAdmin, requireAdmin } = require('../middlewares/auth.middleware');

router.post('/request', authenticateToken, requireHostOrAdmin, WithdrawalController.requestWithdrawal);
router.get('/my-withdrawals', authenticateToken, requireHostOrAdmin, WithdrawalController.listMyWithdrawals);

module.exports = router;
