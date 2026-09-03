const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Basic health check route for DB connectivity
router.get('/health', async (req, res, next) => {
  try {
    const result = await db.query('SELECT NOW() as currentTime');
    res.json({
      status: 'success',
      message: 'Server and Database are healthy',
      time: result.rows[0].currenttime
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;
