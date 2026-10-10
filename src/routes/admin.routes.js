const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const WithdrawalController = require('../controllers/withdrawal.controller');
const AuthController = require('../controllers/auth.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth.middleware');

router.post('/register', AuthController.register);
router.get('/platform/summary', authenticateToken, requireAdmin, AdminController.getPlatformSummary);
router.get('/hosts', authenticateToken, requireAdmin, AdminController.listHosts);
router.get('/withdrawals', authenticateToken, requireAdmin, WithdrawalController.listAdminWithdrawals);
router.post('/withdrawals/:id/transition', authenticateToken, requireAdmin, WithdrawalController.transitionWithdrawal);

module.exports = router;
