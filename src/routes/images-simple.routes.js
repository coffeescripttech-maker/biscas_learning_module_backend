const express = require('express');
const router = express.Router();

/**
 * Simple test endpoint for images
 * GET /api/images/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Images API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;