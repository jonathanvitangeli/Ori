const { ensureSchema, getSql, json } = require('./_db');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Metodo no permitido' });
    }

    await ensureSchema();
    const sql = getSql();
    const { password = '' } = req.body || {};

    const rows = await sql`
      SELECT admin_password
      FROM site_config
      WHERE id = 1
    `;

    const expectedPassword = rows[0]?.admin_password || '123';
    return json(res, 200, { ok: String(password) === String(expectedPassword) });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
