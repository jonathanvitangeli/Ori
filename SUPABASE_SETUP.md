# 🚀 Guía de Integración: Supabase + Vercel

## Paso 1: Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (o inicia sesión)
2. Crea un nuevo proyecto
3. Copia el **Project URL** y **Anon Key** (en Settings > API)
4. Guarda estos valores en un lugar seguro

## Paso 2: Crear Tabla en Supabase

1. En el panel de Supabase, ve a **SQL Editor**
2. Ejecuta este script:

```sql
CREATE TABLE proyectos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  descripcion TEXT NOT NULL,
  descripcion_larga TEXT,
  imagenes JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE site_config (
   id INT PRIMARY KEY,
   portfolio_title TEXT,
   portfolio_background_url TEXT,
   updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO site_config (id, portfolio_title)
VALUES (1, 'Proyectos de Miriam')
ON CONFLICT (id) DO NOTHING;
```

3. Verifica que la tabla se creó correctamente

## Paso 3: Crear Bucket de Storage

1. Ve a **Storage** en Supabase
2. Crea un nuevo bucket llamado `proyectos`
3. Configura permisos:
   - **READ**: Público (para que las imágenes se vean)
   - **WRITE**: Solo autenticado (solo admin puede subir)

Para una primera versión simple, puedes dejar todo público. Después agregar seguridad con Supabase Auth.

## Paso 4: Configurar Variables de Entorno

1. En tu proyecto local, abre el archivo `.env`
2. Reemplaza los valores:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_PASSWORD=123
```

3. Guarda el archivo (⚠️ **Nunca commits .env a git** - ya está en .gitignore)

## Paso 5: Instalar Dependencias

En tu terminal local:

```bash
npm install
```

## Paso 6: Probar Localmente

```bash
npm run dev
```

Abre `http://localhost:3000` en tu navegador. Deberías ver:
- ✅ La página pública mostrando proyectos (vacía al inicio)
- ✅ Puedes hacer click en "Proyectos de Miriam" para ingresar al admin
- ✅ Contraseña: `123`

## Paso 7: Crear Primer Proyecto en Admin

1. Haz click en "Proyectos de Miriam" → Ingresa `123`
2. En el panel admin:
   - Escribe la **Descripción** del proyecto
   - Escribe la **Descripción larga**
   - Selecciona imágenes (puedes seleccionar varias)
   - Haz click en **Guardar**

✅ Debería decir "Proyecto guardado correctamente"

3. Las imágenes se subirán a Supabase Storage
4. Los datos se guardarán en la tabla `proyectos`
5. Recarga la página pública y deberías ver el proyecto

## Paso 8: Deploy en Vercel

### 8.1 Conectar Repository a Vercel

1. Pushea tu código a GitHub (si no está ya):
   ```bash
   git add .
   git commit -m "Supabase integration"
   git push origin main
   ```

2. Ve a [vercel.com](https://vercel.com)
3. Importa tu repositorio GitHub
4. Vercel detectará automáticamente `vite.config.js` y `vercel.json`

### 8.2 Configurar Variables de Entorno en Vercel

1. En el panel de Vercel, ve a **Settings > Environment Variables**
2. Agrega:
   - Key: `VITE_SUPABASE_URL` → Value: Tu URL de Supabase
   - Key: `VITE_SUPABASE_ANON_KEY` → Value: Tu Anon Key
   - Key: `ADMIN_PASSWORD` → Value: `123`

3. Haz click en **Save**

### 8.3 Deploy

1. Vercel automáticamente detecta cambios en GitHub
2. Cada push a `main` despliega automáticamente
3. Tu sitio estará en `https://tu-proyecto.vercel.app`

## Paso 9: Usar la Aplicación en Producción

### Agregar Proyectos

1. Ve a `https://tu-proyecto.vercel.app`
2. Haz click en "Proyectos de Miriam"
3. Ingresa la contraseña
4. Carga proyectos e imágenes
5. Los cambios aparecen inmediatamente en la web pública

### Editar Proyectos

1. En el admin, haz click en el ícono de lápiz ✏️
2. Modifica descripción, descripción larga, o agrega más imágenes
3. Haz click en **Guardar cambios**

### Eliminar Proyectos

1. En el admin, haz click en el ícono de papelera 🗑️
2. Ingresa la contraseña admin
3. Confirma la eliminación

## Arquitectura Final

```
┌─────────────────────────────────────────┐
│         VERCEL (Frontend)               │
│  - index.html (landing + portfolio)     │
│  - admin.html (panel de administración) │
│  - portfolio.html (alternativa)         │
└──────────────┬──────────────────────────┘
               │
               │ (API Calls via JS)
               ↓
┌─────────────────────────────────────────┐
│      SUPABASE (Backend + Storage)       │
│  ┌───────────────────────────────────┐  │
│  │ PostgreSQL Database               │  │
│  │  - tabla: proyectos               │  │
│  │    - id, descripcion              │  │
│  │    - descripcion_larga            │  │
│  │    - imagenes (array de URLs)     │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Storage (Bucket: proyectos)       │  │
│  │  - Almacena imágenes              │  │
│  │  - URLs públicas para el frontend │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Seguridad (Opcional - Fase 2)

Para proteger el admin:

1. Usar **Supabase Auth** en lugar de contraseña simple
2. Agregar **RLS (Row Level Security)** en la tabla `proyectos`:
   - SELECT: Público
   - INSERT/UPDATE/DELETE: Solo usuarios autenticados
3. Agregar **Metadata en Storage** para rastrear quién sube qué

## Troubleshooting

**❌ "Error al cargar proyectos"**
- ✅ Verifica que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están correctos en `.env`
- ✅ Verifica que la tabla `proyectos` existe en Supabase
- ✅ Abre la consola del navegador (F12) y revisa los errores

**❌ Las imágenes no se suben**
- ✅ Verifica que el bucket `proyectos` existe
- ✅ Verifica que los permisos permiten escritura pública
- ✅ Revisa la consola para ver el error exacto

**❌ El sitio en Vercel no carga**
- ✅ Verifica que las variables de entorno están en Vercel
- ✅ Revisa los logs de Vercel (Settings > Deployments > Logs)
- ✅ Asegúrate de que `npm run build` funciona localmente

## ¿Qué sigue?

Una vez todo funcione:

1. **Cambiar contraseña**: Modifica `ADMIN_PASSWORD` en `.env`
2. **Agregar más usuarios**: Implementar Supabase Auth
3. **Mejorar UI**: Agregar validaciones, animaciones, etc.
4. **Hacer backup**: Configurar snapshots automáticas de Supabase
5. **Custom domain**: Apuntar tu dominio a Vercel

---

**¿Preguntas?** Revisa los logs en:
- Navegador: F12 → Console
- Supabase: Logs en el dashboard
- Vercel: Settings > Deployments > Logs
