const express = require('express');
const router = express.Router();
const { NewsletterController } = require('../controllers/memory.controller');

router.post('/subscribe', NewsletterController.subscribe);

module.exports = router;
