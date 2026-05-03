const http = require('http');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

loadEnv(path.resolve(__dirname, '../..', '.env'));

const PORT = Number(process.env.API_PORT || 8081);
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Falta DATABASE_URL o POSTGRES_URL en .env para conectar con Neon.');
  process.exit(1);
}

const sql = neon(connectionString);

const server = http.createServer(async (req, res) => {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    await ensureSchema();

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/proyectos') {
      await handleProyectos(req, res);
      return;
    }

    if (url.pathname === '/api/site-config') {
      await handleSiteConfig(req, res);
      return;
    }

    sendJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`API Neon corriendo en http://localhost:${PORT}`);
});

async function handleProyectos(req, res) {
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, descripcion, descripcion_larga, imagenes, created_at, updated_at
      FROM proyectos
      ORDER BY created_at DESC
    `;
    sendJson(res, 200, rows);
    return;
  }

  const body = await readJsonBody(req);

  if (req.method === 'POST') {
    const { descripcion, descripcion_larga, descripcionLarga, imagenes = [] } = body;
    if (!descripcion) {
      sendJson(res, 400, { error: 'La descripcion es obligatoria' });
      return;
    }

    const id = Date.now();
    const rows = await sql`
      INSERT INTO proyectos (id, descripcion, descripcion_larga, imagenes)
      VALUES (${id}, ${descripcion}, ${descripcion_larga || descripcionLarga || null}, ${JSON.stringify(imagenes)}::jsonb)
      RETURNING id, descripcion, descripcion_larga, imagenes, created_at, updated_at
    `;
    sendJson(res, 201, rows[0]);
    return;
  }

  if (req.method === 'PATCH') {
    const { data = {}, filters = {} } = body;
    const id = Number(filters.id);
    if (!id) {
      sendJson(res, 400, { error: 'Falta id para actualizar' });
      return;
    }

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
    sendJson(res, 200, rows[0] || null);
    return;
  }

  if (req.method === 'DELETE') {
    const id = Number(body?.filters?.id);
    if (!id) {
      sendJson(res, 400, { error: 'Falta id para eliminar' });
      return;
    }

    await sql`DELETE FROM proyectos WHERE id = ${id}`;
    res.writeHead(204);
    res.end();
    return;
  }

  sendJson(res, 405, { error: 'Metodo no permitido' });
}

async function handleSiteConfig(req, res) {
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT id, portfolio_title, portfolio_background_url, updated_at
      FROM site_config
      WHERE id = 1
    `;
    sendJson(res, 200, rows);
    return;
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const body = await readJsonBody(req);
    const payload = body?.data || body || {};
    const rows = await sql`
      INSERT INTO site_config (id, portfolio_title, portfolio_background_url, updated_at)
      VALUES (1, ${payload.portfolio_title || null}, ${payload.portfolio_background_url || null}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        portfolio_title = EXCLUDED.portfolio_title,
        portfolio_background_url = EXCLUDED.portfolio_background_url,
        updated_at = NOW()
      RETURNING id, portfolio_title, portfolio_background_url, updated_at
    `;
    sendJson(res, 200, rows[0]);
    return;
  }

  sendJson(res, 405, { error: 'Metodo no permitido' });
}

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

  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS descripcion_larga TEXT`;
  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;

  await sql`
    CREATE TABLE IF NOT EXISTS site_config (
      id INT PRIMARY KEY,
      portfolio_title TEXT,
      portfolio_background_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS portfolio_title TEXT`;
  await sql`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS portfolio_background_url TEXT`;
  await sql`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;

  await sql`
    INSERT INTO site_config (id, portfolio_title)
    VALUES (1, 'Proyectos Franco')
    ON CONFLICT (id) DO NOTHING
  `;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separator = trimmed.indexOf('=');
    if (separator === -1) return;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  });
}
