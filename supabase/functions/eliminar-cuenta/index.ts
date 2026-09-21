// supabase/functions/eliminar-cuenta/index.ts
//
// Elimina la cuenta del usuario que hace la petición — y solo esa.
//
// Seguridad, por diseño:
//   1. La identidad se obtiene SIEMPRE a partir del JWT de la sesión
//      (adjuntado automáticamente por el SDK del cliente al invocar la
//      función), nunca de un id que pudiera venir en el body de la
//      petición. Un cliente no puede pedir borrar a otra persona aunque
//      lo intente.
//   2. La service role SOLO se usa aquí dentro, en el servidor. Nunca se
//      envía al navegador, nunca aparece en el bundle de React, nunca
//      lleva prefijo VITE_ y nunca se sube al repositorio — vive
//      exclusivamente como secreto de esta función en Supabase
//      (supabase secrets set ...).
//   3. Al borrar la fila de auth.users, todas las tablas relacionadas
//      (profiles, votos, seguimientos, notificaciones como receptor y
//      como actor, solicitudes_amistad en ambas direcciones) se limpian
//      automáticamente por los ON DELETE CASCADE ya existentes en el
//      esquema — no hace falta borrar tabla por tabla desde aquí.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respuesta(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return respuesta({ error: 'Método no permitido.' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return respuesta({ error: 'No autenticado.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      // No se filtra ningún detalle técnico al cliente; esto es un fallo
      // de configuración del servidor, no del usuario.
      console.error('Faltan variables de entorno en la Edge Function eliminar-cuenta.')
      return respuesta({ error: 'No se pudo procesar la solicitud. Inténtalo más tarde.' }, 500)
    }

    // Cliente "de usuario": ANON key + el JWT de quien llama. Se usa
    // exclusivamente para preguntarle a Supabase Auth "¿quién eres
    // realmente?" — nunca para leer ni escribir nada más.
    const clienteUsuario = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await clienteUsuario.auth.getUser()
    if (userError || !userData?.user) {
      return respuesta({ error: 'No autenticado.' }, 401)
    }

    const idAutenticado = userData.user.id

    // Cliente administrativo: SOLO aquí, con la service role tomada de un
    // secreto de la función, nunca de una variable con prefijo VITE_ ni
    // de nada accesible desde el navegador.
    const clienteAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { error: deleteError } = await clienteAdmin.auth.admin.deleteUser(idAutenticado)
    if (deleteError) {
      console.error('Error eliminando usuario:', deleteError.message)
      return respuesta({ error: 'No se pudo eliminar la cuenta.' }, 500)
    }

    return respuesta({ ok: true }, 200)
  } catch (e) {
    console.error('Error inesperado en eliminar-cuenta:', e)
    return respuesta({ error: 'Error inesperado.' }, 500)
  }
})
