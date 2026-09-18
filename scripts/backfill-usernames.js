// Backfill de nombre_usuario para perfiles existentes que todavía no
// tienen uno asignado (nombre_usuario IS NULL). No es una migración de
// esquema: la columna nombre_usuario y su restricción UNIQUE ya existen
// desde la migración 0002_perfil_extendido.sql — esto es solo relleno de
// datos, determinista y sin colisiones, generado a partir del nombre
// visible de cada perfil.
//
// NO usa el email como identificador público en ningún momento: el slug
// se genera únicamente a partir de la columna "nombre". No modifica
// "nombre" ni ningún otro campo — solo escribe en filas donde
// nombre_usuario es actualmente null.
//
// USO:
//   node scripts/backfill-usernames.js --dry-run   (solo muestra qué haría, no escribe nada)
//   node scripts/backfill-usernames.js              (aplica los cambios de verdad)
//
// Requiere en tu .env (nunca en src/, nunca con prefijo VITE_):
//   SUPABASE_URL=...                  (o reutiliza VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY=...     (Project Settings > API > service_role)

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en tu .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const dryRun = process.argv.includes('--dry-run')

const LONGITUD_MINIMA = 3
const LONGITUD_MAXIMA = 20
const USERNAME_RESERVA = 'usuario' // base si el nombre no deja ningún carácter válido

// Mismas reglas de formato que ya usa Perfil.jsx (src/lib/username.js):
// minúsculas, sin acentos, espacios -> "_", solo [a-z0-9_], 3-20 caracteres.
function generarSlugBase(nombre) {
  const limpio = (nombre ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos/diacríticos
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') // sin _ sobrantes al principio/final
    .slice(0, LONGITUD_MAXIMA)

  if (limpio.length >= LONGITUD_MINIMA) return limpio
  if (limpio.length === 0) return USERNAME_RESERVA
  // Nombre válido pero demasiado corto (p. ej. "Al" -> "al"): se rellena
  // con dígitos hasta la longitud mínima, nunca con datos inventados del
  // usuario.
  return (limpio + '000').slice(0, LONGITUD_MINIMA)
}

// A partir del slug base, añade _2, _3... hasta encontrar uno libre,
// comprobando tanto los usernames ya existentes en la base de datos como
// los que se van asignando en esta misma pasada del backfill.
function resolverSlugSinColision(slugBase, ocupados) {
  if (!ocupados.has(slugBase)) return slugBase
  let sufijo = 2
  while (true) {
    // El sufijo puede empujar el resultado más allá de 20 caracteres si el
    // slug base ya iba muy justo de longitud — se recorta el propio slug
    // base (no el sufijo) para que el resultado final siga siendo válido.
    const candidato = `${slugBase.slice(0, LONGITUD_MAXIMA - String(sufijo).length - 1)}_${sufijo}`
    if (!ocupados.has(candidato)) return candidato
    sufijo++
  }
}

async function main() {
  console.log(dryRun ? '=== Backfill de usernames (--dry-run, no se escribe nada) ===' : '=== Backfill de usernames (ejecución real) ===')

  // 1) Todos los usernames ya ocupados, para detectar colisiones desde el
  //    principio (incluye los que ya tenían los perfiles sin tocar).
  const { data: todos, error: errTodos } = await admin.from('profiles').select('id, nombre, nombre_usuario')
  if (errTodos) {
    console.error('Error leyendo profiles:', errTodos.message)
    process.exit(1)
  }

  const ocupados = new Set(todos.filter((p) => p.nombre_usuario).map((p) => p.nombre_usuario))
  const pendientes = todos.filter((p) => !p.nombre_usuario)

  console.log(`Perfiles totales: ${todos.length}`)
  console.log(`Con username ya asignado: ${todos.length - pendientes.length}`)
  console.log(`Pendientes de backfill (nombre_usuario IS NULL): ${pendientes.length}`)
  console.log('')

  if (pendientes.length === 0) {
    console.log('Nada que hacer — todos los perfiles ya tienen username.')
    return
  }

  const asignaciones = []
  for (const perfil of pendientes) {
    const slugBase = generarSlugBase(perfil.nombre)
    const slugFinal = resolverSlugSinColision(slugBase, ocupados)
    ocupados.add(slugFinal) // reservado para el resto de esta misma pasada
    asignaciones.push({ id: perfil.id, nombreActual: perfil.nombre, nuevoUsername: slugFinal })
  }

  console.log('Asignaciones que se aplicarían:')
  for (const a of asignaciones) {
    console.log(`  ${a.id}  "${a.nombreActual ?? '(sin nombre)'}"  ->  @${a.nuevoUsername}`)
  }
  console.log('')
  console.log(`Total a actualizar: ${asignaciones.length}`)

  if (dryRun) {
    console.log('\n--dry-run: no se ha escrito nada. Revisa la lista y ejecuta sin --dry-run para aplicarlo de verdad.')
    return
  }

  let aplicados = 0
  for (const a of asignaciones) {
    const { error } = await admin
      .from('profiles')
      .update({ nombre_usuario: a.nuevoUsername })
      .eq('id', a.id)
      .is('nombre_usuario', null) // no sobrescribe si, entre medias, ya se le asignó uno
    if (error) {
      console.error(`✗ ${a.id} (@${a.nuevoUsername}): ${error.message}`)
      continue
    }
    aplicados++
  }
  console.log(`\nHecho: ${aplicados}/${asignaciones.length} perfiles actualizados.`)
}

main()
