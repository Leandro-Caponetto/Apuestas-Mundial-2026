# Sistema de Predicciones Mundial 2026 ⚽

Este es un sistema fullstack moderno para realizar predicciones del Mundial FIFA 2026.

## 🚀 Configuración de Supabase

Para que la aplicación funcione, debes seguir estos pasos en tu proyecto de Supabase:

1. **Crear Tablas**: Copia y ejecuta el contenido de `supabase-schema.sql` en el SQL Editor de Supabase.
2. **Cargar Datos**: (Opcional) Ejecuta `supabase-seed.sql` para tener algunos equipos de ejemplo.
3. **Configurar Auth**: En Supabase, ve a `Authentication > Providers` y asegúrate de que `Email` esté activado (puedes desactivar 'Confirm email' para pruebas rápidas).
4. **Variables de Entorno**: Configura las siguientes variables en el panel de **Secrets** (o `.env` local):
   - `VITE_SUPABASE_URL`: Tu URL del proyecto.
   - `VITE_SUPABASE_ANON_KEY`: Tu Anon Key pública.
   - `SUPABASE_SERVICE_ROLE_KEY`: Tu Service Role key (necesaria para el backend para calcular puntos).

## 🛠️ Tecnologías

- **Frontend**: React 19, Vite, Tailwind CSS, Motion (Animaciones).
- **Backend**: Node.js + Express (Servidor para lógica de puntos).
- **Base de Datos**: Supabase (PostgreSQL + Auth + RLS).

## 📊 Sistema de Puntos

- **Resultado Exacto**: 3 puntos.
- **Ganador Correcto**: 1 punto.
- **Incorrecto**: 0 puntos.

## 🔒 Seguridad

La aplicación utiliza **Row Level Security (RLS)** en Supabase para asegurar que los usuarios solo puedan editar sus propias predicciones y perfiles.
