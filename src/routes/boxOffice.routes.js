const express = require('express');
const router = express.Router();
const BoxOfficeController = require('../controllers/boxOffice.controller');
const { authenticateToken, requireHostOrAdmin } = require('../middlewares/auth.middleware');

router.post('/walkup-sale', authenticateToken, requireHostOrAdmin, BoxOfficeController.createWalkupSale);

module.exports = router;
