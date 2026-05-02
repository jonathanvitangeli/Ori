const { ensureSchema, json, sql } = require('./_db');

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, portfolio_title, portfolio_background_url, updated_at
        FROM site_config
        WHERE id = 1
      `;
      return json(res, 200, rows);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const payload = req.body?.data || req.body || {};
      const rows = await sql`
        INSERT INTO site_config (id, portfolio_title, portfolio_background_url, updated_at)
        VALUES (
          1,
          ${payload.portfolio_title || null},
          ${payload.portfolio_background_url || null},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          portfolio_title = EXCLUDED.portfolio_title,
          portfolio_background_url = EXCLUDED.portfolio_background_url,
          updated_at = NOW()
        RETURNING id, portfolio_title, portfolio_background_url, updated_at
      `;
      return json(res, 200, rows[0]);
    }

    return json(res, 405, { error: 'Metodo no permitido' });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
