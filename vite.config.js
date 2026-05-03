import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { neon } from '@neondatabase/serverless'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const connectionString = env.DATABASE_URL || env.POSTGRES_URL
  const sql = connectionString ? neon(connectionString) : null

  return {
    plugins: [
      {
        name: 'neon-dev-api',
        configureServer(server) {
          server.middlewares.use('/api/proyectos', async (req, res) => {
            await handleProyectos(req, res, sql)
          })

          server.middlewares.use('/api/site-config', async (req, res) => {
            await handleSiteConfig(req, res, sql)
          })

          server.middlewares.use('/api/auth', async (req, res) => {
            await handleAuth(req, res, sql)
          })
        }
      }
    ],
    server: {
      port: 3000,
      strictPort: false
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), 'index.html'),
          admin: resolve(process.cwd(), 'admin.html'),
          portfolio: resolve(process.cwd(), 'portfolio.html'),
          proyecto: resolve(process.cwd(), 'proyecto.html')
        }
      }
    }
  }
})

async function handleAuth(req, res, sql) {
  try {
    await ensureReady(sql)

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Metodo no permitido' })
      return
    }

    const body = await readJsonBody(req)
    const rows = await sql`
      SELECT admin_password
      FROM site_config
      WHERE id = 1
    `
    const expectedPassword = rows[0]?.admin_password || '123'
    sendJson(res, 200, { ok: String(body?.password || '') === String(expectedPassword) })
  } catch (error) {
    sendJson(res, 500, { error: error.message })
  }
}

async function handleProyectos(req, res, sql) {
  try {
    await ensureReady(sql)

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, descripcion, descripcion_larga, imagenes, created_at, updated_at
        FROM proyectos
        ORDER BY created_at DESC
      `
      sendJson(res, 200, rows)
      return
    }

    const body = await readJsonBody(req)

    if (req.method === 'POST') {
      const { descripcion, descripcion_larga, descripcionLarga, imagenes = [] } = body
      if (!descripcion) {
        sendJson(res, 400, { error: 'La descripcion es obligatoria' })
        return
      }

      const id = Date.now()
      const rows = await sql`
        INSERT INTO proyectos (id, descripcion, descripcion_larga, imagenes)
        VALUES (${id}, ${descripcion}, ${descripcion_larga || descripcionLarga || null}, ${JSON.stringify(imagenes)}::jsonb)
        RETURNING id, descripcion, descripcion_larga, imagenes, created_at, updated_at
      `
      sendJson(res, 201, rows[0])
      return
    }

    if (req.method === 'PATCH') {
      const { data = {}, filters = {} } = body
      const id = Number(filters.id)
      if (!id) {
        sendJson(res, 400, { error: 'Falta id para actualizar' })
        return
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
      `
      sendJson(res, 200, rows[0] || null)
      return
    }

    if (req.method === 'DELETE') {
      const id = Number(body?.filters?.id)
      if (!id) {
        sendJson(res, 400, { error: 'Falta id para eliminar' })
        return
      }

      await sql`DELETE FROM proyectos WHERE id = ${id}`
      res.statusCode = 204
      res.end()
      return
    }

    sendJson(res, 405, { error: 'Metodo no permitido' })
  } catch (error) {
    sendJson(res, 500, { error: error.message })
  }
}

async function handleSiteConfig(req, res, sql) {
  try {
    await ensureReady(sql)

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, portfolio_title, portfolio_background_url, updated_at
        FROM site_config
        WHERE id = 1
      `
      sendJson(res, 200, rows)
      return
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJsonBody(req)
      const payload = body?.data || body || {}
      const rows = await sql`
        INSERT INTO site_config (id, portfolio_title, portfolio_background_url, updated_at)
        VALUES (1, ${payload.portfolio_title || null}, ${payload.portfolio_background_url || null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          portfolio_title = EXCLUDED.portfolio_title,
          portfolio_background_url = EXCLUDED.portfolio_background_url,
          updated_at = NOW()
        RETURNING id, portfolio_title, portfolio_background_url, updated_at
      `
      sendJson(res, 200, rows[0])
      return
    }

    sendJson(res, 405, { error: 'Metodo no permitido' })
  } catch (error) {
    sendJson(res, 500, { error: error.message })
  }
}

async function ensureReady(sql) {
  if (!sql) {
    throw new Error('Falta DATABASE_URL o POSTGRES_URL en .env para conectar con Neon.')
  }

  await sql`
    CREATE TABLE IF NOT EXISTS proyectos (
      id BIGSERIAL PRIMARY KEY,
      descripcion TEXT NOT NULL,
      descripcion_larga TEXT,
      imagenes JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS descripcion_larga TEXT`
  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS imagenes JSONB DEFAULT '[]'::jsonb`
  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`
  await sql`ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`

  await sql`
    CREATE TABLE IF NOT EXISTS site_config (
      id INT PRIMARY KEY,
      portfolio_title TEXT,
      portfolio_background_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS portfolio_title TEXT`
  await sql`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS portfolio_background_url TEXT`
  await sql`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT '123'`
  await sql`ALTER TABLE site_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`
  await sql`ALTER TABLE site_config ALTER COLUMN admin_password SET DEFAULT '123'`

  await sql`
    INSERT INTO site_config (id, portfolio_title)
    VALUES (1, 'Proyectos Franco')
    ON CONFLICT (id) DO NOTHING
  `

  await sql`
    UPDATE site_config
    SET admin_password = '123'
    WHERE id = 1 AND admin_password IS NULL
  `
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
