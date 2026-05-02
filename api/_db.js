const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('Falta DATABASE_URL o POSTGRES_URL para conectar con Neon.');
}

const sql = neon(connectionString);

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS proyectos (
      id BIGSERIAL PRIMARY KEY,
      descripcion TEXT NOT NULL,
      descripcion_larga TEXT,
      imagenes JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS site_config (
      id INT PRIMARY KEY,
      portfolio_title TEXT,
      portfolio_background_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    INSERT INTO site_config (id, portfolio_title)
    VALUES (1, 'Proyectos Franco')
    ON CONFLICT (id) DO NOTHING
  `;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

module.exports = { ensureSchema, json, sql };
