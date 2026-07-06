import { clerkMiddleware, getAuth } from '@clerk/express';
import pool from '../db/pool.js';

// Attach Clerk to all routes
export const clerk = clerkMiddleware();

// Require a valid Clerk session
export const requireAuth = (req, res, next) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.clerkUserId = auth.userId;
  req.clerkOrgId = auth.orgId;
  next();
};

// Resolve farm + role from DB, attach to req
export const requireFarm = async (req, res, next) => {
  try {
    const { clerkUserId, clerkOrgId } = req;

    if (!clerkOrgId) {
      return res.status(403).json({ error: 'No organization selected' });
    }

    // Find or create the farm for this org
    let farmResult = await pool.query(
      'SELECT * FROM farms WHERE clerk_org_id = $1',
      [clerkOrgId]
    );

    if (farmResult.rows.length === 0) {
      // Auto-provision farm on first access
      farmResult = await pool.query(
        'INSERT INTO farms (clerk_org_id, name) VALUES ($1, $2) RETURNING *',
        [clerkOrgId, 'My Farm']
      );
    }

    const farm = farmResult.rows[0];
    req.farmId = farm.id;
    req.farm = farm;

    // Get user role
    const userResult = await pool.query(
      'SELECT role FROM farm_users WHERE clerk_user_id = $1 AND farm_id = $2',
      [clerkUserId, farm.id]
    );

    if (userResult.rows.length === 0) {
      // First user in org becomes admin
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM farm_users WHERE farm_id = $1',
        [farm.id]
      );
      const role = countResult.rows[0].count === '0' ? 'admin' : 'employee';
      await pool.query(
        'INSERT INTO farm_users (clerk_user_id, farm_id, role) VALUES ($1, $2, $3)',
        [clerkUserId, farm.id, role]
      );
      req.userRole = role;
    } else {
      req.userRole = userResult.rows[0].role;
    }

    next();
  } catch (err) {
    console.error('requireFarm error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Role gate middleware
export const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Role gate middleware - allow any of the listed roles
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Trucker middleware - can see loads across linked farms
export const resolveTruckerFarms = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT f.id FROM farms f
       JOIN trucker_farm_links t ON t.farm_id = f.id
       WHERE t.clerk_user_id = $1`,
      [req.clerkUserId]
    );
    req.truckerFarmIds = result.rows.map(r => r.id);
    next();
  } catch (err) {
    next(err);
  }
};
