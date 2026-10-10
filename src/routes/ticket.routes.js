const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticket.controller');
const { authenticateToken, requireHostOrAdmin, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/my-tickets', optionalAuth, TicketController.getMyTickets);
router.get('/:idOrCode', TicketController.getTicketDetails);
router.post('/scan', authenticateToken, requireHostOrAdmin, TicketController.scanTicket);

module.exports = router;
