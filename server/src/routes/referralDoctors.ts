import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { authMiddleware, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// GET all referral doctors
// Location-scoped: non-SUDO users see only their location's doctors
// Note: Cache removed because response varies by user's location_id
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = 'SELECT id, name, designation, location_id FROM referral_doctors';
    const params: any[] = [];

    // Location scoping: only SUDO sees all doctors
    if (user?.role !== 'SUDO') {
      if (user?.location_id === null || user?.location_id === undefined) {
        // User has no location assigned - return empty result
        return res.json([]);
      }
      query += ' WHERE (location_id = $1 OR location_id IS NULL)';
      params.push(user.location_id);
    }

    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching referral doctors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single referral doctor (location-scoped)
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = 'SELECT id, name, designation, location_id FROM referral_doctors WHERE id = $1';
    const params: any[] = [req.params.id];

    // Location scoping: only SUDO sees all doctors
    if (user?.role !== 'SUDO') {
      if (user?.location_id === null || user?.location_id === undefined) {
        return res.status(403).json({ error: 'User must have a location assigned' });
      }
      query += ' AND (location_id = $2 OR location_id IS NULL)';
      params.push(user.location_id);
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Referral doctor not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Create new referral doctor (requires auth and MANAGE_B2B permission)
// Location-scoped: new doctor inherits creator's location_id
router.post('/', authMiddleware, requirePermission(['MANAGE_B2B']), async (req: Request, res: Response) => {
  try {
    const { name, designation } = req.body;
    const user = (req as any).user;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Doctor name is required' });
    }

    // Inherit location_id from creating user (unless SUDO)
    const locationId = user?.role === 'SUDO' ? null : user?.location_id;

    const result = await pool.query(
      'INSERT INTO referral_doctors (name, designation, location_id) VALUES ($1, $2, $3) RETURNING id, name, designation, location_id',
      [name.trim(), designation?.trim() || null, locationId]
    );
    console.log('✅ Created referral doctor:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH - Update referral doctor (requires auth and MANAGE_B2B permission)
// Location-scoped: user can only update doctors in their location
router.patch('/:id', authMiddleware, requirePermission(['MANAGE_B2B']), async (req: Request, res: Response) => {
  try {
    const { name, designation } = req.body;
    const user = (req as any).user;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Doctor name is required' });
    }

    // Build WHERE clause with location scoping
    let whereClause = 'WHERE id = $3';
    const params: any[] = [name.trim(), designation?.trim() || null, req.params.id];

    if (user?.role !== 'SUDO') {
      if (user?.location_id === null || user?.location_id === undefined) {
        return res.status(403).json({ error: 'User must have a location assigned to update referral doctors' });
      }
      whereClause += ' AND (location_id = $4 OR location_id IS NULL)';
      params.push(user.location_id);
    }

    const result = await pool.query(
      `UPDATE referral_doctors SET name = $1, designation = $2, updated_at = CURRENT_TIMESTAMP ${whereClause} RETURNING id, name, designation, location_id`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Referral doctor not found or access denied' });
    console.log('✅ Updated referral doctor:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - Delete referral doctor (requires auth and MANAGE_B2B permission)
// Location-scoped: user can only delete doctors in their location
router.delete('/:id', authMiddleware, requirePermission(['MANAGE_B2B']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let whereClause = 'WHERE id = $1';
    const params: any[] = [req.params.id];

    if (user?.role !== 'SUDO') {
      if (user?.location_id === null || user?.location_id === undefined) {
        return res.status(403).json({ error: 'User must have a location assigned to delete referral doctors' });
      }
      whereClause += ' AND (location_id = $2 OR location_id IS NULL)';
      params.push(user.location_id);
    }

    const result = await pool.query(
      `DELETE FROM referral_doctors ${whereClause} RETURNING id, name, designation, location_id`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Referral doctor not found or access denied' });
    console.log('✅ Deleted referral doctor:', result.rows[0]);
    res.json({ message: 'Referral doctor deleted successfully', doctor: result.rows[0] });
  } catch (error) {
    console.error('Error deleting referral doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

