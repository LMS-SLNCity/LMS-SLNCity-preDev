import { Router, Request, Response } from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Middleware to check authentication
router.use(authMiddleware);

// GET /api/dashboard/overview - Get dashboard overview metrics
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const user = (req as any).user;
    
    // Only SUDO sees all data; others are scoped to their location
    // If user is not SUDO and has no location assigned, return empty metrics
    if (user?.role !== 'SUDO' && (user?.location_id === null || user?.location_id === undefined)) {
      return res.json({
        totalVisits: 0,
        totalRevenue: 0,
        totalTests: 0,
        totalClients: 0,
        pendingTests: 0,
        approvedTests: 0,
        rejectedTests: 0,
        avgTatHours: 0,
        collectionRate: 0,
      });
    }
    
    const locationId = user?.role === 'SUDO' ? null : user?.location_id;

    // Build WHERE clauses
    const buildVisitWhere = () => {
      const w: string[] = [];
      const p: any[] = [];
      if (startDate && endDate) {
        w.push(`created_at >= $${p.length + 1} AND created_at <= $${p.length + 2}`);
        p.push(startDate, endDate);
      }
      if (locationId !== null && locationId !== undefined) {
        w.push(`location_id = $${p.length + 1}`);
        p.push(locationId);
      }
      return { clause: w.length ? 'WHERE ' + w.join(' AND ') : '', params: p };
    };

    const buildTestWhere = (statusFilter: string) => {
      const w: string[] = [statusFilter];
      const p: any[] = [];
      if (startDate && endDate) {
        w.push(`vt.created_at >= $${p.length + 1} AND vt.created_at <= $${p.length + 2}`);
        p.push(startDate, endDate);
      }
      if (locationId !== null && locationId !== undefined) {
        w.push(`v.location_id = $${p.length + 1}`);
        p.push(locationId);
      }
      return { clause: 'WHERE ' + w.join(' AND '), params: p };
    };

    // Get total visits count
    const { clause: visitsClause, params: visitsParams } = buildVisitWhere();
    const visitsResult = await pool.query(`SELECT COUNT(*) as total_visits FROM visits ${visitsClause}`, visitsParams);
    const totalVisits = parseInt(visitsResult.rows[0].total_visits);

    // Get total revenue
    const revenueResult = await pool.query(`SELECT SUM(total_cost) as total_revenue FROM visits ${visitsClause}`, visitsParams);
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;

    // Get total tests performed (excluding cancelled)
    const { clause: testsClause, params: testsParams } = buildTestWhere(`vt.status != 'CANCELLED'`);
    const testsResult = await pool.query(
      `SELECT COUNT(*) as total_tests FROM visit_tests vt JOIN visits v ON vt.visit_id = v.id ${testsClause}`,
      testsParams
    );
    const totalTests = parseInt(testsResult.rows[0].total_tests);

    // Get total B2B clients
    const clientsResult = await pool.query("SELECT COUNT(*) as total_clients FROM clients WHERE type = 'REFERRAL_LAB'");
    const totalClients = parseInt(clientsResult.rows[0].total_clients);

    // Get pending tests
    const { clause: pendingClause, params: pendingParams } = buildTestWhere(`vt.status IN ('PENDING', 'SAMPLE_COLLECTED', 'IN_PROGRESS')`);
    const pendingResult = await pool.query(
      `SELECT COUNT(*) as pending_tests FROM visit_tests vt JOIN visits v ON vt.visit_id = v.id ${pendingClause}`,
      pendingParams
    );
    const pendingTests = parseInt(pendingResult.rows[0].pending_tests);

    // Get approved tests
    const { clause: approvedClause, params: approvedParams } = buildTestWhere(`vt.status = 'APPROVED'`);
    const approvedResult = await pool.query(
      `SELECT COUNT(*) as approved_tests FROM visit_tests vt JOIN visits v ON vt.visit_id = v.id ${approvedClause}`,
      approvedParams
    );
    const approvedTests = parseInt(approvedResult.rows[0].approved_tests);

    // Get rejected tests
    const { clause: rejectedClause, params: rejectedParams } = buildTestWhere(`vt.status = 'REJECTED'`);
    const rejectedResult = await pool.query(
      `SELECT COUNT(*) as rejected_tests FROM visit_tests vt JOIN visits v ON vt.visit_id = v.id ${rejectedClause}`,
      rejectedParams
    );
    const rejectedTests = parseInt(rejectedResult.rows[0].rejected_tests);

    // Get average TAT
    const { clause: tatClause, params: tatParams } = buildTestWhere(`vt.approved_at IS NOT NULL AND vt.collected_at IS NOT NULL`);
    const tatResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (vt.approved_at - vt.collected_at))/3600) as avg_tat_hours FROM visit_tests vt JOIN visits v ON vt.visit_id = v.id ${tatClause}`,
      tatParams
    );
    const avgTatHours = parseFloat(tatResult.rows[0].avg_tat_hours) || 0;

    // Get collection rate (percentage of tests collected vs pending)
    const collectionRate = totalTests > 0 ? ((totalTests - pendingTests) / totalTests * 100) : 0;

    res.json({
      totalVisits,
      totalRevenue,
      totalTests,
      totalClients,
      pendingTests,
      approvedTests,
      rejectedTests,
      avgTatHours: Math.round(avgTatHours * 10) / 10,
      collectionRate: Math.round(collectionRate * 10) / 10,
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/revenue - Get revenue metrics
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only SUDO sees all data; others are scoped to their location
    // If user is not SUDO and has no location assigned, return empty metrics
    if (user?.role !== 'SUDO' && (user?.location_id === null || user?.location_id === undefined)) {
      return res.json({
        byPaymentMode: [],
        byClient: [],
        dailyRevenue: [],
      });
    }
    
    const { startDate, endDate } = req.query;
    const locationId = user?.role === 'SUDO' ? null : user?.location_id;

    // Build date filter
    let dateFilter = '';
    const baseParams: any[] = [];
    if (startDate && endDate) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      baseParams.push(startDate, endDate);
    }
    
    // Add location filter for non-SUDO users
    if (locationId !== null && locationId !== undefined) {
      if (dateFilter) {
        dateFilter += ` AND location_id = $${baseParams.length + 1}`;
      } else {
        dateFilter = `WHERE location_id = $${baseParams.length + 1}`;
      }
      baseParams.push(locationId);
    }

    // Get revenue by payment mode
    const paymentModeResult = await pool.query(`
      SELECT payment_mode, COUNT(*) as count, SUM(total_cost) as revenue
      FROM visits
      ${dateFilter}
      GROUP BY payment_mode
      ORDER BY revenue DESC
    `, baseParams);

    // Get revenue by B2B client (sorted by revenue in descending order)
    let clientRevenueQuery = `
      SELECT c.id, c.name, c.balance, COUNT(v.id) as visit_count, SUM(v.total_cost) as total_revenue
      FROM clients c
      LEFT JOIN visits v ON c.id = v.ref_customer_id
      WHERE c.type = 'REFERRAL_LAB'`;
    
    const clientParams: any[] = [];
    if (startDate && endDate) {
      clientRevenueQuery += ` AND v.created_at >= $1 AND v.created_at <= $2`;
      clientParams.push(startDate, endDate);
    }
    
    if (locationId !== null && locationId !== undefined) {
      clientRevenueQuery += ` AND v.location_id = $${clientParams.length + 1}`;
      clientParams.push(locationId);
    }
    
    clientRevenueQuery += `
      GROUP BY c.id, c.name, c.balance
      ORDER BY total_revenue DESC NULLS LAST`;
    const clientRevenueResult = await pool.query(clientRevenueQuery, clientParams);

    // Get daily revenue for the selected period
    const dailyRevenueResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as visit_count, SUM(total_cost) as revenue
      FROM visits
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, baseParams);

    res.json({
      byPaymentMode: paymentModeResult.rows,
      byClient: clientRevenueResult.rows,
      dailyRevenue: dailyRevenueResult.rows,
    });
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/tests - Get test distribution metrics
router.get('/tests', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only SUDO sees all data; others are scoped to their location
    // If user is not SUDO and has no location assigned, return empty metrics
    if (user?.role !== 'SUDO' && (user?.location_id === null || user?.location_id === undefined)) {
      return res.json({
        byTemplate: [],
        byStatus: [],
        byCategory: [],
      });
    }
    
    const { startDate, endDate } = req.query;
    const locationId = user?.role === 'SUDO' ? null : user?.location_id;

    // Get tests by template (excluding cancelled)
    let byTemplateQuery = `
      SELECT tt.id, tt.name, tt.code, tt.category, tt.parameters, COUNT(vt.id) as count
      FROM test_templates tt
      LEFT JOIN visit_tests vt ON tt.id = vt.test_template_id AND vt.status != 'CANCELLED'
      LEFT JOIN visits v ON vt.visit_id = v.id`;
    
    let byTemplateWhere: string[] = [];
    let byTemplateParams: any[] = [];
    
    if (startDate && endDate) {
      byTemplateWhere.push(`vt.created_at >= $1 AND vt.created_at <= $2`);
      byTemplateParams.push(startDate, endDate);
    }
    
    if (locationId !== null && locationId !== undefined) {
      byTemplateWhere.push(`v.location_id = $${byTemplateParams.length + 1}`);
      byTemplateParams.push(locationId);
    }
    
    if (byTemplateWhere.length > 0) {
      byTemplateQuery += ` WHERE ${byTemplateWhere.join(' AND ')}`;
    }
    
    byTemplateQuery += `
      GROUP BY tt.id, tt.name, tt.code, tt.category, tt.parameters
      ORDER BY count DESC`;
    const byTemplateResult = await pool.query(byTemplateQuery, byTemplateParams);

    // Get tests by status
    let byStatusQuery = `
      SELECT status, COUNT(*) as count
      FROM visit_tests vt
      LEFT JOIN visits v ON vt.visit_id = v.id`;
    
    let byStatusWhere: string[] = [];
    let byStatusParams: any[] = [];
    
    if (startDate && endDate) {
      byStatusWhere.push(`vt.created_at >= $1 AND vt.created_at <= $2`);
      byStatusParams.push(startDate, endDate);
    }
    
    if (locationId !== null && locationId !== undefined) {
      byStatusWhere.push(`v.location_id = $${byStatusParams.length + 1}`);
      byStatusParams.push(locationId);
    }
    
    if (byStatusWhere.length > 0) {
      byStatusQuery += ` WHERE ${byStatusWhere.join(' AND ')}`;
    }
    
    byStatusQuery += `
      GROUP BY status
      ORDER BY count DESC`;
    const byStatusResult = await pool.query(byStatusQuery, byStatusParams);

    // Get tests by category (excluding cancelled)
    let byCategoryQuery = `
      SELECT tt.category, COUNT(vt.id) as count
      FROM test_templates tt
      LEFT JOIN visit_tests vt ON tt.id = vt.test_template_id AND vt.status != 'CANCELLED'
      LEFT JOIN visits v ON vt.visit_id = v.id`;
    
    let byCategoryWhere: string[] = [];
    let byCategoryParams: any[] = [];
    
    if (startDate && endDate) {
      byCategoryWhere.push(`vt.created_at >= $1 AND vt.created_at <= $2`);
      byCategoryParams.push(startDate, endDate);
    }
    
    if (locationId !== null && locationId !== undefined) {
      byCategoryWhere.push(`v.location_id = $${byCategoryParams.length + 1}`);
      byCategoryParams.push(locationId);
    }
    
    if (byCategoryWhere.length > 0) {
      byCategoryQuery += ` WHERE ${byCategoryWhere.join(' AND ')}`;
    }
    
    byCategoryQuery += `
      GROUP BY tt.category
      ORDER BY count DESC`;
    const byCategoryResult = await pool.query(byCategoryQuery, byCategoryParams);

    res.json({
      byTemplate: byTemplateResult.rows,
      byStatus: byStatusResult.rows,
      byCategory: byCategoryResult.rows,
    });
  } catch (error) {
    console.error('Error fetching test metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/clients - Get B2B client metrics
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only SUDO sees all data; others are scoped to their location
    // If user is not SUDO and has no location assigned, return empty metrics
    if (user?.role !== 'SUDO' && (user?.location_id === null || user?.location_id === undefined)) {
      return res.json({
        clients: [],
        ledgerSummary: [],
      });
    }
    
    const locationId = user?.role === 'SUDO' ? null : user?.location_id;
    
    // Get all B2B clients with their balance and visit count
    let clientsQuery = `
      SELECT 
        c.id, 
        c.name, 
        c.balance,
        COUNT(v.id) as visit_count,
        SUM(v.total_cost) as total_revenue,
        SUM(CASE WHEN v.due_amount > 0 THEN v.due_amount ELSE 0 END) as pending_dues
      FROM clients c
      LEFT JOIN visits v ON c.id = v.ref_customer_id
      WHERE c.type = 'REFERRAL_LAB'`;
    
    const clientsParams: any[] = [];
    if (locationId !== null && locationId !== undefined) {
      clientsQuery += ` AND v.location_id = $1`;
      clientsParams.push(locationId);
    }
    
    clientsQuery += `
      GROUP BY c.id, c.name, c.balance
      ORDER BY total_revenue DESC
    `;
    
    const clientsResult = await pool.query(clientsQuery, clientsParams);

    // Get ledger summary for each client
    let ledgerQuery = `
      SELECT 
        c.id,
        c.name,
        SUM(CASE WHEN le.type = 'DEBIT' THEN le.amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN le.type = 'CREDIT' THEN le.amount ELSE 0 END) as total_credits
      FROM clients c
      LEFT JOIN ledger_entries le ON c.id = le.client_id
      WHERE c.type = 'REFERRAL_LAB'`;
    
    const ledgerParams: any[] = [];
    if (locationId !== null && locationId !== undefined) {
      ledgerQuery += ` AND c.location_id = $1`;
      ledgerParams.push(locationId);
    }
    
    ledgerQuery += `
      GROUP BY c.id, c.name`;
    const ledgerResult = await pool.query(ledgerQuery, ledgerParams);

    res.json({
      clients: clientsResult.rows,
      ledgerSummary: ledgerResult.rows,
    });
  } catch (error) {
    console.error('Error fetching client metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/trends - Get business trends
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only SUDO sees all data; others are scoped to their location
    // If user is not SUDO and has no location assigned, return empty metrics
    if (user?.role !== 'SUDO' && (user?.location_id === null || user?.location_id === undefined)) {
      return res.json({
        visitsTrend: [],
        testsTrend: [],
        averageRevenue: { avg_revenue: 0, min_revenue: 0, max_revenue: 0 },
      });
    }
    
    const { startDate, endDate } = req.query;
    const locationId = user?.role === 'SUDO' ? null : user?.location_id;

    // Build date filter for visits
    let visitDateFilter = '';
    const visitParams: any[] = [];
    if (startDate && endDate) {
      visitDateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      visitParams.push(startDate, endDate);
    }
    
    // Add location filter for non-SUDO users
    if (locationId !== null && locationId !== undefined) {
      if (visitDateFilter) {
        visitDateFilter += ` AND location_id = $${visitParams.length + 1}`;
      } else {
        visitDateFilter = `WHERE location_id = $${visitParams.length + 1}`;
      }
      visitParams.push(locationId);
    }

    // Get visits trend
    const visitsTrendResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM visits
      ${visitDateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, visitParams);

    // Get tests trend (excluding cancelled)
    let testsTrendQuery = `
      SELECT DATE(vt.created_at) as date, COUNT(*) as count
      FROM visit_tests vt
      LEFT JOIN visits v ON vt.visit_id = v.id
      WHERE vt.status != 'CANCELLED'`;
    
    let testsTrendParams: any[] = [];
    if (startDate && endDate) {
      testsTrendQuery += ` AND vt.created_at >= $1 AND vt.created_at <= $2`;
      testsTrendParams.push(startDate, endDate);
    }
    
    if (locationId !== null && locationId !== undefined) {
      testsTrendQuery += ` AND v.location_id = $${testsTrendParams.length + 1}`;
      testsTrendParams.push(locationId);
    }
    
    testsTrendQuery += `
      GROUP BY DATE(vt.created_at)
      ORDER BY date ASC`;
    const testsTrendResult = await pool.query(testsTrendQuery, testsTrendParams);

    // Get average revenue per visit
    const avgRevenueResult = await pool.query(`
      SELECT AVG(total_cost) as avg_revenue, MIN(total_cost) as min_revenue, MAX(total_cost) as max_revenue
      FROM visits
      ${visitDateFilter}
    `, visitParams);

    res.json({
      visitsTrend: visitsTrendResult.rows,
      testsTrend: testsTrendResult.rows,
      averageRevenue: avgRevenueResult.rows[0],
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

