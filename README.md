# Nightlife App — Gijón (MVP, fase de infraestructura)

Web app mobile-first para responder "¿dónde va a salir la gente hoy?" en Gijón.

Esta fase incluye únicamente: estructura del proyecto, autenticación (registro,
login, recuperación de contraseña) y base de datos. Las pantallas finales
(ranking, listado de locales, fichas) se construyen en la siguiente fase.

## 1. Instalación local

```bash
npm install
cp .env.example .env
```

Rellena `.env` con los datos de tu proyecto de Supabase (paso 2).

```bash
npm run dev
```

## 2. Crear el proyecto de Supabase

1. Crea un proyecto en https://supabase.com.
2. En **Project Settings > API**, copia la `Project URL` y la `anon public key` a tu `.env`.
3. En el **SQL Editor**, ejecuta en este orden:
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed_catalogo.sql`
4. En **Authentication > Providers**, deja activado "Email".
   - Si quieres probar rápido sin verificar email, puedes desactivar
     "Confirm email" en **Authentication > Settings** (recomendado solo
     para desarrollo, no para producción).
5. En **Authentication > URL Configuration**, añade como "Redirect URLs":
   - `http://localhost:5173/restablecer-password` (desarrollo)
   - `https://TU-DOMINIO-DE-VERCEL.vercel.app/restablecer-password` (producción, cuando lo tengas desplegado)

## 3. Desplegar en Vercel

1. Sube este proyecto a un repositorio (GitHub/GitLab).
2. Impórtalo en Vercel (detecta Vite automáticamente).
3. En **Project Settings > Environment Variables**, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Despliega, y añade la URL resultante a las Redirect URLs de Supabase (paso 2.5).

## 4. Cómo comprobar que todo funciona

1. `npm run dev` y abre `http://localhost:5173`.
2. Deberías caer en `/login` (no hay sesión).
3. Ve a "Regístrate", crea una cuenta de prueba.
4. Deberías llegar a la pantalla "Sesión iniciada" (Home temporal).
5. En el panel de Supabase, en **Table Editor > profiles**, comprueba que
   se ha creado automáticamente una fila con ese usuario.
6. Pulsa "Cerrar sesión" y vuelve a entrar con "Iniciar sesión" para confirmar el login.
7. Prueba "¿Has olvidado tu contraseña?" con el email de la cuenta creada:
   deberías recibir un correo de Supabase con un enlace a `/restablecer-password`.

## 5. Crear votos de prueba

Los votos no se pueden sembrar por SQL directamente porque cada voto necesita
un `usuario_id` real de `auth.users`. Para probarlo:

1. Registra 2-3 usuarios de prueba desde la propia app (paso 4.3).
2. En **Table Editor > profiles**, copia sus `id`.
3. Ejecuta en el SQL Editor, sustituyendo los IDs y nombres de local:

```sql
insert into public.votos (usuario_id, local_id, fecha)
values (
  'ID-DEL-USUARIO-DE-PRUEBA',
  (select id from public.locales where nombre = 'Boulevar'),
  current_date
);
```

## Notas

- Los datos de `seed_catalogo.sql` son **datos de desarrollo**: los nombres
  están inspirados en zonas y locales reales de Gijón, pero horarios,
  descripciones y eventos son inventados para probar la app, no información
  verificada de esos negocios.
- La lectura de la tabla `votos` está abierta a cualquier usuario autenticado
  (necesario para poder calcular el ranking). Es la opción más simple para el
  MVP; si más adelante se quiere ocultar el detalle de quién votó qué, se
  puede sustituir por una función/vista agregada sin cambiar el resto de la app.
