# ✅ Checklist: Configuración Supabase + Vercel

## Fase 1: Setup Inicial (Hoy)

### Supabase
- [ ] Crear cuenta en supabase.com
- [ ] Crear nuevo proyecto
- [ ] Copiar **Project URL** → guardar
- [ ] Copiar **Anon Key** → guardar
- [ ] En SQL Editor: ejecutar script de la tabla `proyectos` (ver SUPABASE_SETUP.md)
- [ ] Crear bucket `proyectos` en Storage (público)

### Proyecto Local
- [ ] Abrir `.env` en VS Code
- [ ] Pegar URL de Supabase en `VITE_SUPABASE_URL`
- [ ] Pegar Anon Key en `VITE_SUPABASE_ANON_KEY`
- [ ] Guardar `.env`
- [ ] En terminal: `npm install`
- [ ] En terminal: `npm run dev`
- [ ] ✅ Si ves "Local: http://localhost:3000" → OK
- [ ] Abrir navegador en http://localhost:3000
- [ ] ✅ Si ves "Proyectos de Miriam" → OK
- [ ] Hacer click en título → debería pedir contraseña
- [ ] Ingresar `123` → debería abrir admin panel

### Test Admin Panel
- [ ] En admin panel, escribir título del proyecto
- [ ] Escribir descripción
- [ ] Seleccionar al menos una imagen
- [ ] Click en "Guardar"
- [ ] ✅ Si aparece "Proyecto guardado correctamente" → OK
- [ ] Refrescar página pública (Ctrl+F5)
- [ ] ✅ Si ves el proyecto → OK

---

## Fase 2: Deploy en Vercel (Próximo Paso)

### GitHub
- [ ] Abrir terminal en carpeta del proyecto
- [ ] Ejecutar:
  ```bash
  git add .
  git commit -m "Supabase integration"
  git push origin main
  ```

### Vercel
- [ ] Ir a vercel.com
- [ ] Hacer click en "Import Git Repository"
- [ ] Seleccionar el repositorio `MiriamYerba.github.io`
- [ ] Vercel detecta que es un proyecto Vite (✅)
- [ ] Haz click en "Deploy"
- [ ] Esperar a que termine el deploy (~2-3 min)
- [ ] Vercel te dará una URL como `https://tu-url.vercel.app`
- [ ] Abrir esa URL en el navegador
- [ ] ⚠️ Probablemente verás error porque faltan variables de entorno

### Variables de Entorno en Vercel
- [ ] En Vercel, ir a **Settings > Environment Variables**
- [ ] Agregar estas 3 variables:
  - [ ] `VITE_SUPABASE_URL` = Tu URL de Supabase
  - [ ] `VITE_SUPABASE_ANON_KEY` = Tu Anon Key
  - [ ] `ADMIN_PASSWORD` = `123`
- [ ] Haz click en "Save"
- [ ] En **Deployments**, busca el último deploy
- [ ] Haz click en los tres puntitos → "Redeploy"
- [ ] Esperar a que termine (~1-2 min)

### Test en Producción
- [ ] Abrir de nuevo la URL de Vercel
- [ ] ✅ Si ves "Proyectos de Miriam" → OK
- [ ] Hacer click en título → admin password
- [ ] Ingresar `123`
- [ ] ✅ Si ves el admin panel → OK
- [ ] Agregar un nuevo proyecto
- [ ] ✅ Si se guarda y aparece en la página pública → ¡LISTO! 🎉

---

## Fase 3: Optimizaciones Futuras (Opcional)

- [ ] Cambiar contraseña admin en `.env` y Vercel
- [ ] Agregar validaciones de formulario
- [ ] Crear dominio personalizado en Vercel
- [ ] Implementar Supabase Auth para múltiples usuarios
- [ ] Agregar RLS (Row Level Security) en Supabase
- [ ] Configurar backup automático de BD

---

## Troubleshooting

**Error: "No se conecta a Supabase"**
- Verifica que `.env` tiene las credenciales correctas
- Abre F12 → Console y busca errores rojos
- Verifica que la tabla existe en Supabase

**Error: "No se suben las imágenes"**
- Verifica que el bucket `proyectos` existe
- Verifica que está marcado como público

**Error en Vercel: "Página en blanco"**
- Verifica que las 3 variables están en Environment Variables
- Haz redeploy después de agregar variables
- Revisa los logs (Deployments > Logs)

---

## Notas Importantes

1. **`.env` NO se pushea a GitHub** ✅ Ya está en `.gitignore`
2. **Las credenciales son secretas** 🔒 No las compartas
3. **Cada cambio en GitHub = auto-deploy en Vercel**
4. **Los cambios de contenido (proyectos) NO requieren redeploy** 🚀 Solo van a Supabase
