const express = require('express');
const router = express.Router();
const BlogController = require('../controllers/blog.controller');

router.get('/', BlogController.listBlogs);
router.get('/:slug', BlogController.getBlogBySlug);

module.exports = router;
