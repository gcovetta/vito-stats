# Vito · Estadísticas

App web instalable (PWA) con los goles, partidos, torneos, tablas y datos de las canilleras de Vito.
Datos en **Supabase**, publicada en **GitHub Pages**.

## Puesta en marcha

1. **Supabase → SQL Editor**: pegar y ejecutar `supabase/schema.sql`.
2. **Supabase → Authentication**: desactivar *Allow new users to sign up* y crear los usuarios (Garo y Vito) con *Auto Confirm*.
3. Completar `config.js` con la Project URL y la publishable key (`sb_publishable_…`) o la anon key.
4. **GitHub → Settings → Pages**: *Deploy from a branch* → `main` / `(root)`.
5. Abrir `https://gcovetta.github.io/vito-stats/`, entrar y en **Vito → Ajustes → Importar datos** pegar lo exportado desde la portada de Claude.

## Instalar en el iPhone

Abrir el link en **Safari** → botón **Compartir** → **Agregar a inicio**. Abrir la app desde el ícono e iniciar sesión una vez.

## Cómo está hecho

- `index.html`: toda la app (sin build). Usa `@supabase/supabase-js` desde CDN.
- Tabla única `public.docs (col, id, data jsonb)`, con colecciones `torneos`, `partidos`, `fisico`, `clubes`, `perfil`.
- Seguridad por RLS: solo usuarios logueados leen y escriben. La clave del `config.js` es pública por diseño.
- Tiempo real: cuando alguien carga un gol, el otro celular se actualiza solo.
- `sw.js`: permite abrir la app sin señal y la deja instalable.
- `.github/workflows/keepalive.yml`: lunes y jueves llama a `keepalive()` en Supabase para que el proyecto gratis no se pause. Si pasan 45 días sin commits, hace un commit de mantenimiento para que GitHub no desactive el workflow.
- Videos de goles: bucket privado `videos` en Supabase Storage (`supabase/videos.sql`). Se suben desde el formulario del partido, uno por gol, y se ven desde el fixture, Inicio y la pestaña Vito.
- Extras: logros, próximo objetivo, placa del partido para compartir (se dibuja en el teléfono), comparación mes a mes de las canilleras, mapa de goles (campo `pos` por gol), historial por rival y resumen de temporada.
