import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin, requireRole } from '../middleware/auth.js';
import { syncIncomeForCommodity } from '../db/incomeSync.js';
import { syncCommodityValuation, refreshCurrentPrice } from '../db/commodityValuation.js';

const router = Router();

// Re-fetches a commodity with the same price_changed flag the list
// endpoint computes, so responses from the price/close routes don't
// silently drop that indicator until the next full reload.
async function withPriceChanged(id) {
  const { rows } = await pool.query(
    `SELECT c.*,
      (SELECT COUNT(*) FROM commodity_price_history h WHERE h.commodity_id = c.id) > 1 AS price_changed
     FROM commodities c WHERE c.id = $1`,
    [id]
  );
  return rows[0];
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM commodity_price_history h WHERE h.commodity_id = c.id) > 1 AS price_changed
       FROM commodities c
       WHERE c.farm_id = $1 AND c.deleted_at IS NULL ORDER BY c.created_at DESC`,
      [req.farmId]
    );
    // Financials are admin-only - strip price/value fields for other roles
    const sanitized = req.userRole === 'admin' ? rows : rows.map(
      ({ price_per_ton, buyer_customer_id, estimated_value, actual_value, price_changed, ...rest }) => rest
    );
    res.json(sanitized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('admin', 'employee'), async (req, res) => {
  try {
    const b = req.body;
    const isAdmin = req.userRole === 'admin';
    // Price/buyer are financial - only admins may set them, even at creation
    const initialPrice = isAdmin ? (b.price_per_ton || null) : null;
    const initialBuyer = isAdmin ? (b.buyer_customer_id || null) : null;
    const { rows } = await pool.query(
      `INSERT INTO commodities (
        farm_id, type, field_id, year, price_per_ton, buyer_customer_id,
        stack_number, type_of_forage, forage_grade, cutting, bale_count, avg_bale_weight_lbs,
        estimated_stack_tonnage, actual_stack_tonnage, test_pdf_url, tarp, notes,
        type_crop, seed_details, estimated_tons_per_acre, estimated_total_tons,
        actual_tons, actual_tons_per_acre
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [
        req.farmId, b.type, b.field_id || null, b.year || new Date().getFullYear(), initialPrice, initialBuyer,
        b.stack_number, b.type_of_forage, b.forage_grade || null, b.cutting,
        b.bale_count || null, b.avg_bale_weight_lbs || null,
        b.estimated_stack_tonnage || null, b.actual_stack_tonnage || null, b.test_pdf_url || null,
        b.tarp || null, b.notes || null,
        b.type_crop, b.seed_details,
        b.estimated_tons_per_acre || null, b.estimated_total_tons || null,
        b.actual_tons || null, b.actual_tons_per_acre || null,
      ]
    );
    const commodity = rows[0];

    // Seed the first price history row so this commodity is never gapped -
    // every subsequent valuation lookup has at least one row to fall back on.
    if (initialPrice) {
      await pool.query(
        `INSERT INTO commodity_price_history (commodity_id, price_per_ton, buyer_customer_id, effective_date, note, created_by_clerk_id)
         VALUES ($1,$2,$3,CURRENT_DATE,$4,$5)`,
        [commodity.id, initialPrice, initialBuyer, 'Initial price at creation', req.clerkUserId]
      );
      await syncCommodityValuation(commodity.id);
    }

    res.status(201).json(commodity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Edit - price/buyer are deliberately NOT settable here. They only ever
// change through POST /:id/price, which appends a price-history row
// instead of overwriting the current value, so past loads keep the price
// that was actually effective on their date.
router.put('/:id', requireRole('admin', 'employee'), async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `UPDATE commodities SET
        type=$1, field_id=$2, year=$3,
        stack_number=$4, type_of_forage=$5, forage_grade=$6, cutting=$7, bale_count=$8,
        avg_bale_weight_lbs=$9, estimated_stack_tonnage=$10, actual_stack_tonnage=$11,
        tarp=$12, notes=$13,
        type_crop=$14, seed_details=$15, estimated_tons_per_acre=$16,
        estimated_total_tons=$17, actual_tons=$18, actual_tons_per_acre=$19
       WHERE id=$20 AND farm_id=$21 AND deleted_at IS NULL RETURNING *`,
      [
        b.type, b.field_id || null, b.year || new Date().getFullYear(),
        b.stack_number, b.type_of_forage, b.forage_grade || null, b.cutting, b.bale_count || null,
        b.avg_bale_weight_lbs || null, b.estimated_stack_tonnage || null, b.actual_stack_tonnage || null,
        b.tarp || null, b.notes || null,
        b.type_crop, b.seed_details, b.estimated_tons_per_acre || null,
        b.estimated_total_tons || null, b.actual_tons || null, b.actual_tons_per_acre || null,
        req.params.id, req.farmId,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    // price_per_ton/buyer are no longer editable through this route, so
    // there's nothing here that could change a load's income - only a
    // price change (POST /:id/price) or the load itself needs a resync.
    await syncCommodityValuation(rows[0].id);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Record a price/buyer change - forward-only, always appends a history
// row rather than overwriting price_per_ton in place. A backdated
// effective_date re-prices every load shipped on or after it.
router.post('/:id/price', requireAdmin, async (req, res) => {
  try {
    const { price_per_ton, buyer_customer_id, effective_date, note } = req.body;
    if (price_per_ton === undefined || price_per_ton === null || price_per_ton === '' || !effective_date) {
      return res.status(400).json({ error: 'price_per_ton and effective_date are required' });
    }
    const { rows: existing } = await pool.query(
      'SELECT id FROM commodities WHERE id=$1 AND farm_id=$2 AND deleted_at IS NULL',
      [req.params.id, req.farmId]
    );
    if (!existing.length) return res.status(404).json({ error: 'Not found' });

    await pool.query(
      `INSERT INTO commodity_price_history (commodity_id, price_per_ton, buyer_customer_id, effective_date, note, created_by_clerk_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [req.params.id, price_per_ton, buyer_customer_id || null, effective_date, note || null, req.clerkUserId]
    );
    await refreshCurrentPrice(req.params.id);
    await syncCommodityValuation(req.params.id);
    // income (the simpler, current-price-based figure) also depends on
    // this commodity's price, unlike actual_value which is already
    // resolved historically - keep it in sync too.
    await syncIncomeForCommodity(req.params.id, req.farmId);

    res.json(await withPriceChanged(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/price-history', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.*, c.company_name as buyer_name
       FROM commodity_price_history h
       LEFT JOIN customers c ON c.id = h.buyer_customer_id
       JOIN commodities co ON co.id = h.commodity_id
       WHERE h.commodity_id = $1 AND co.farm_id = $2
       ORDER BY h.effective_date DESC, h.created_at DESC`,
      [req.params.id, req.farmId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Closing is a manual admin action, never inferred from tonnage matching -
// shortfall from spoilage or feed-out is normal and doesn't mean an error.
router.put('/:id/close', requireAdmin, async (req, res) => {
  try {
    const { is_closed } = req.body;
    const { rows } = await pool.query(
      'UPDATE commodities SET is_closed=$1 WHERE id=$2 AND farm_id=$3 AND deleted_at IS NULL RETURNING id',
      [!!is_closed, req.params.id, req.farmId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    // Closing/reopening changes whether unshipped tonnage is still valued.
    await syncCommodityValuation(req.params.id);
    res.json(await withPriceChanged(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE commodities SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
      [req.params.id, req.farmId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
