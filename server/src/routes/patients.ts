import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import { auditPatient } from '../middleware/auditLogger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = 'SELECT id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, location_id FROM patients';
    const queryParams: any[] = [];

    // Apply location filtering for non-SUDO users
    if (user && user.role !== 'SUDO') {
      if (user.location_id === null || user.location_id === undefined) {
        // User has no location assigned - return empty result
        return res.json([]);
      }
      query += ' WHERE location_id = $1';
      queryParams.push(user.location_id);
      console.log(`📍 User ${user.id} fetching patients for location ${user.location_id}`);
    }
    // SUDO users see all patients

    query += ' ORDER BY id';
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search patients by phone or name
router.get('/search/:query', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const searchQuery = req.params.query.trim();

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let query = `SELECT id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, location_id
       FROM patients
       WHERE (phone = $1 OR LOWER(name) LIKE LOWER($2))`;
    const queryParams: any[] = [searchQuery, `%${searchQuery}%`];

    // Apply location filtering for non-SUDO users
    if (user && user.role !== 'SUDO') {
      if (user.location_id === null || user.location_id === undefined) {
        // User has no location assigned - cannot search
        return res.json([]);
      }
      query += ` AND location_id = $3`;
      queryParams.push(user.location_id);
      console.log(`📍 User ${user.id} searching patients for location ${user.location_id}`);
    }
    // SUDO users search all patients

    query += ` ORDER BY
         CASE WHEN phone = $1 THEN 1 ELSE 2 END,
         name
       LIMIT 20`;

    const result = await pool.query(query, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = 'SELECT id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, location_id FROM patients WHERE id = $1';
    const queryParams: any[] = [req.params.id];

    // Apply location filtering for non-SUDO users
    if (user && user.role !== 'SUDO') {
      if (user.location_id === null || user.location_id === undefined) {
        return res.status(403).json({ error: 'User must have a location assigned' });
      }
      query += ` AND location_id = $2`;
      queryParams.push(user.location_id);
    }

    const result = await pool.query(query, queryParams);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history } = req.body;
    
    // Enforce location requirement for non-SUDO users
    if (user && user.role !== 'SUDO') {
      if (user.location_id === null || user.location_id === undefined) {
        return res.status(403).json({ error: 'User must have a location assigned to create patients' });
      }
    }
    
    // Automatically assign location based on staff member's location
    const locationId = user?.location_id || null;

    const result = await pool.query(
      `INSERT INTO patients (salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, location_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, patient_code, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, location_id`,
      [salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, locationId]
    );

    const patient = result.rows[0];
    console.log(`📍 Patient ${patient.id} created by ${user?.username} at location ${locationId || 'central'}`);

    // Audit log: Patient registration
    await auditPatient.create(req, patient.id, patient);

    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history } = req.body;

    // Get old values for audit trail
    const oldResult = await pool.query(
      'SELECT id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, location_id FROM patients WHERE id = $1',
      [req.params.id]
    );

    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check location access for non-SUDO users
    if (user && user.role !== 'SUDO') {
      if (user.location_id === null || user.location_id === undefined) {
        return res.status(403).json({ error: 'User must have a location assigned to update patients' });
      }
      const patientLocation = oldResult.rows[0].location_id;
      if (patientLocation !== null && patientLocation !== user.location_id) {
        return res.status(403).json({ error: 'You can only edit patients from your assigned location' });
      }
    }

    const oldData = oldResult.rows[0];

    const result = await pool.query(
      `UPDATE patients
       SET salutation = COALESCE($1, salutation),
           name = COALESCE($2, name),
           age_years = COALESCE($3, age_years),
           age_months = COALESCE($4, age_months),
           age_days = COALESCE($5, age_days),
           sex = COALESCE($6, sex),
           guardian_name = COALESCE($7, guardian_name),
           phone = COALESCE($8, phone),
           address = COALESCE($9, address),
           email = COALESCE($10, email),
           clinical_history = COALESCE($11, clinical_history),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING id, salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, location_id`,
      [salutation, name, age_years, age_months, age_days, sex, guardian_name, phone, address, email, clinical_history, req.params.id]
    );

    const newData = result.rows[0];

    // Audit log: Patient update with old and new values
    await auditPatient.update(req, parseInt(req.params.id), oldData, newData);

    res.json(newData);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

