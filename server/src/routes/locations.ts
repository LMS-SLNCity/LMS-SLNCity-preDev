import express from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// Public endpoint: list active locations (synced from branches)
router.get('/public/locations', async (req, res) => {
  try {
    // Fetch from branches table instead of locations to always get latest data
    const result = await pool.query(`
      SELECT id, name, address, is_active 
      FROM branches 
      WHERE is_active = true 
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
