const express = require('express');
const router = express.Router();
const { MemoryController } = require('../controllers/memory.controller');

router.get('/', MemoryController.listMemories);

module.exports = router;
