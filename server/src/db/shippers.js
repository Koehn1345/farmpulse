import pool from './pool.js';

// A load belongs to an outside shipper when its field (or, if the load has
// no field, its commodity's field) is attached to one. Such loads never
// create farm income/expense rows - their trucking charge (gross_pay) is
// reported separately as trucking income instead.
export async function loadShipperId(load) {
  const { rows } = await pool.query(
    `SELECT f.shipper_id FROM fields f
     WHERE f.id = COALESCE($1::uuid, (SELECT field_id FROM commodities WHERE id = $2::uuid))`,
    [load.field_id || null, load.commodity_id || null]
  );
  return rows[0]?.shipper_id || null;
}

// Per-shipper trucking totals for loads hauled off their fields.
// year = null means all years.
export async function shipperStats(farmId, year) {
  const { rows } = await pool.query(
    `SELECT s.*,
       (SELECT COUNT(*) FROM fields f WHERE f.shipper_id = s.id AND f.deleted_at IS NULL)::int AS field_count,
       COALESCE(x.loads, 0)::int AS loads,
       COALESCE(x.tons, 0)::float AS tons,
       COALESCE(x.trucking_income, 0)::float AS trucking_income
     FROM shippers s
     LEFT JOIN (
       SELECT f.shipper_id, COUNT(*) AS loads, SUM(l.net_weight) / 2000 AS tons, SUM(l.gross_pay) AS trucking_income
       FROM loads l
       LEFT JOIN commodities co ON co.id = l.commodity_id
       JOIN fields f ON f.id = COALESCE(l.field_id, co.field_id)
       WHERE l.farm_id = $1 AND l.deleted_at IS NULL AND f.shipper_id IS NOT NULL
         AND ($2::int IS NULL OR EXTRACT(YEAR FROM l.date) = $2)
       GROUP BY f.shipper_id
     ) x ON x.shipper_id = s.id
     WHERE s.farm_id = $1 AND s.deleted_at IS NULL
     ORDER BY s.name`,
    [farmId, year]
  );
  return rows;
}
