import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/test-inquiries
 * Public endpoint: Submit a test inquiry (no authentication required)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, organization, testIds, message } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Insert inquiry
    const result = await pool.query(
      `INSERT INTO test_inquiries (name, email, phone, organization, test_ids, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, organization, test_ids, message, created_at, is_read`,
      [name, email, phone || null, organization || null, testIds?.join(',') || null, message || null]
    );

    const inquiry = result.rows[0];

    res.status(201).json({
      message: 'Inquiry submitted successfully. Our team will contact you soon.',
      inquiryId: inquiry.id,
      inquiry
    });
  } catch (error) {
    console.error('Error submitting test inquiry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/test-inquiries
 * Protected endpoint: Get all inquiries (admin/sudo only)
 */
router.get('/', authMiddleware, requirePermission(['MANAGE_B2B', 'VIEW_ADMIN_PANEL']), async (req: Request, res: Response) => {
  try {
    const { isRead, limit = '50', offset = '0' } = req.query;

    let query = 'SELECT id, name, email, phone, organization, test_ids, message, created_at, is_read FROM test_inquiries';
    const params: any[] = [];

    if (isRead !== undefined) {
      query += ` WHERE is_read = $1`;
      params.push(isRead === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM test_inquiries';
    if (isRead !== undefined) {
      countQuery += ` WHERE is_read = $1`;
    }
    const countResult = await pool.query(countQuery, isRead !== undefined ? [isRead === 'true'] : []);

    res.json({
      inquiries: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching test inquiries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/test-inquiries/:id
 * Protected endpoint: Get single inquiry (admin/sudo only)
 */
router.get('/:id', authMiddleware, requirePermission(['MANAGE_B2B', 'VIEW_ADMIN_PANEL']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, email, phone, organization, test_ids, message, created_at, is_read, admin_notes
       FROM test_inquiries WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    // Mark as read if not already
    if (!result.rows[0].is_read) {
      await pool.query(
        `UPDATE test_inquiries SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching test inquiry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/test-inquiries/:id
 * Protected endpoint: Update inquiry with admin notes (admin/sudo only)
 */
router.patch('/:id', authMiddleware, requirePermission(['MANAGE_B2B', 'VIEW_ADMIN_PANEL']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes, isRead } = req.body;

    const result = await pool.query(
      `UPDATE test_inquiries 
       SET admin_notes = COALESCE($1, admin_notes),
           is_read = COALESCE($2, is_read)
       WHERE id = $3
       RETURNING id, name, email, phone, organization, test_ids, message, created_at, is_read, admin_notes`,
      [adminNotes || null, isRead !== undefined ? isRead : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating test inquiry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/test-inquiries/unread/count
 * Protected endpoint: Get count of unread inquiries (admin/sudo only)
 */
router.get('/unread/count', authMiddleware, requirePermission(['MANAGE_B2B', 'VIEW_ADMIN_PANEL']), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM test_inquiries WHERE is_read = false`
    );

    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching unread inquiry count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
