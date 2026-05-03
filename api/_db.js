const { neon } = require('@neondatabase/serverless');

let sql;

function getSql() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error('Falta DATABASE_URL o POSTGRES_URL para conectar con Neon.');
  }

  if (!sql) {
    sql = neon(connectionString);
  }

  return sql;
}

async function ensureSchema() {
  const db = getSql();

  await db`
    CREATE TABLE IF NOT EXISTS proyectos (
      id BIGSERIAL PRIMARY KEY,
      descripcion TEXT NOT NULL,
      descripcion_larga TEXT,
      imagenes JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS descripcion_larga TEXT`;
  await db`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]'::jsonb`;
  await db`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await db`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;

  await db`
    CREATE TABLE IF NOT EXISTS site_config (
      id INT PRIMARY KEY,
      portfolio_title TEXT,
      portfolio_background_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await db`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS portfolio_title TEXT`;
  await db`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS portfolio_background_url TEXT`;
  await db`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;

  await db`
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

module.exports = { ensureSchema, getSql, json };
