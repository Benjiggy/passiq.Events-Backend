const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

// Checkout Initialization (Paystack, Flutterwave, Stripe, Crypto)
router.post('/initialize', optionalAuth, PaymentController.initializePayment);
router.post('/verify', optionalAuth, PaymentController.verifyPayment);

// Dedicated Crypto Endpoints
router.post('/crypto/initialize', optionalAuth, (req, res, next) => {
  req.body.provider = 'crypto';
  PaymentController.initializePayment(req, res, next);
});
router.post('/crypto/verify', optionalAuth, (req, res, next) => {
  req.body.provider = 'crypto';
  PaymentController.verifyPayment(req, res, next);
});

// Webhook Handlers
router.post('/webhook/:provider', PaymentController.handleWebhook);
router.post('/paystack/webhook', (req, res, next) => {
  req.params.provider = 'paystack';
  PaymentController.handleWebhook(req, res, next);
});
router.post('/crypto/webhook', (req, res, next) => {
  req.params.provider = 'crypto';
  PaymentController.handleWebhook(req, res, next);
});

module.exports = router;
