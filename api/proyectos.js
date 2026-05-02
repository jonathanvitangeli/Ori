const { ensureSchema, json, sql } = require('./_db');

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, descripcion, descripcion_larga, imagenes, created_at, updated_at
        FROM proyectos
        ORDER BY created_at DESC
      `;
      return json(res, 200, rows);
    }

    if (req.method === 'POST') {
      const { descripcion, descripcion_larga, descripcionLarga, imagenes = [] } = req.body || {};
      if (!descripcion) return json(res, 400, { error: 'La descripcion es obligatoria' });

      const rows = await sql`
        INSERT INTO proyectos (descripcion, descripcion_larga, imagenes)
        VALUES (${descripcion}, ${descripcion_larga || descripcionLarga || null}, ${JSON.stringify(imagenes)}::jsonb)
        RETURNING id, descripcion, descripcion_larga, imagenes, created_at, updated_at
      `;
      return json(res, 201, rows[0]);
    }

    if (req.method === 'PATCH') {
      const { data = {}, filters = {} } = req.body || {};
      const id = Number(filters.id);
      if (!id) return json(res, 400, { error: 'Falta id para actualizar' });

      const rows = await sql`
        UPDATE proyectos
        SET
          descripcion = COALESCE(${data.descripcion || null}, descripcion),
          descripcion_larga = COALESCE(${data.descripcion_larga || data.descripcionLarga || null}, descripcion_larga),
          imagenes = COALESCE(${data.imagenes ? JSON.stringify(data.imagenes) : null}::jsonb, imagenes),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, descripcion, descripcion_larga, imagenes, created_at, updated_at
      `;
      return json(res, 200, rows[0] || null);
    }

    if (req.method === 'DELETE') {
      const id = Number(req.body?.filters?.id);
      if (!id) return json(res, 400, { error: 'Falta id para eliminar' });

      await sql`DELETE FROM proyectos WHERE id = ${id}`;
      res.statusCode = 204;
      return res.end();
    }

    return json(res, 405, { error: 'Metodo no permitido' });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
