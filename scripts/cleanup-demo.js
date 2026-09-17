// Script de limpieza — v2: borra ÚNICAMENTE los usuarios con
// user_metadata.demo === true (la MISMA condición principal y obligatoria
// de siempre; nunca se decide por username ni por el dominio del email).
//
// Confirmado en la auditoría (ver seed-demo.js para el detalle completo):
// profiles, votos, solicitudes_amistad (en ambas direcciones) y
// notificaciones ya tienen ON DELETE CASCADE hacia auth.users desde las
// migraciones originales, así que borrar el usuario Auth basta — no hace
// falta borrar nada de eso a mano, ni tocar ninguna tabla legacy.
//
// Seguridad añadida: si DEMO_OWNER_USER_ID está configurado, esa cuenta se
// excluye explícitamente de cualquier borrado, incluso en el hipotético
// caso de que alguna vez apareciera con demo:true por error — nunca debe
// poder desaparecer por ejecutar este script. Las amistades demo entre esa
// cuenta y los bots sí desaparecen igualmente, porque son filas propias de
// los bots (se borran por cascada al borrar a los bots, no a la cuenta).
//
// USO:
//   node scripts/cleanup-demo.js --dry-run   (solo lista, no borra nada)
//   node scripts/cleanup-demo.js             (borra de verdad)

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_OWNER_USER_ID = process.env.DEMO_OWNER_USER_ID || null

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en tu .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const dryRun = process.argv.includes('--dry-run')

async function listarUsuariosDemo() {
  const demo = []
  let pagina = 1
  const porPagina = 200

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: porPagina })
    if (error) {
      console.error('Error listando usuarios:', error.message)
      process.exit(1)
    }
    demo.push(...data.users.filter((u) => u.user_metadata?.demo === true))
    if (data.users.length < porPagina) break
    pagina++
  }

  // Capa extra de seguridad: pase lo que pase, DEMO_OWNER_USER_ID (si está
  // configurado) nunca entra en la lista de borrado, ni siquiera si por
  // error tuviera demo:true en sus metadatos.
  if (DEMO_OWNER_USER_ID) {
    return demo.filter((u) => u.id !== DEMO_OWNER_USER_ID)
  }
  return demo
}

async function contarFilasRelacionadas(idsDemo) {
  const { count: votos } = await admin
    .from('votos')
    .select('*', { count: 'exact', head: true })
    .in('usuario_id', idsDemo)
  const { count: amistades } = await admin
    .from('solicitudes_amistad')
    .select('*', { count: 'exact', head: true })
    .or(`usuario_solicitante_id.in.(${idsDemo.join(',')}),usuario_receptor_id.in.(${idsDemo.join(',')})`)
  return { votos: votos ?? 0, amistades: amistades ?? 0 }
}

async function main() {
  const usuariosDemo = await listarUsuariosDemo()

  if (usuariosDemo.length === 0) {
    console.log('No hay usuarios demo que borrar.')
    return
  }

  console.log(`Usuarios demo encontrados (${usuariosDemo.length}):`)
  usuariosDemo.slice(0, 20).forEach((u) => console.log(`  - ${u.email} (${u.id})`))
  if (usuariosDemo.length > 20) console.log(`  ... y ${usuariosDemo.length - 20} más`)

  if (DEMO_OWNER_USER_ID) {
    console.log(`\nDEMO_OWNER_USER_ID (${DEMO_OWNER_USER_ID}) está protegido explícitamente y no se tocará.`)
  }

  const idsDemo = usuariosDemo.map((u) => u.id)
  const { votos, amistades } = await contarFilasRelacionadas(idsDemo)
  console.log(`\nSe borrarán en cascada: ${votos} votos y ${amistades} solicitudes_amistad asociados a estos usuarios.`)
  console.log('Ningún usuario sin demo:true en sus metadatos puede resultar afectado por este script.')

  if (dryRun) {
    console.log('\n--dry-run: no se ha borrado nada. Ejecuta sin --dry-run para borrarlos de verdad.')
    return
  }

  console.log('\nBorrando...')
  let borrados = 0
  for (const u of usuariosDemo) {
    const { error } = await admin.auth.admin.deleteUser(u.id)
    if (error) console.error(`✗ ${u.email}: ${error.message}`)
    else {
      borrados++
      if (borrados % 25 === 0) console.log(`  ... ${borrados}/${usuariosDemo.length} borrados`)
    }
  }

  console.log(
    `\nListo. ${borrados} usuarios demo (y sus perfiles, votos y amistades demo) se han borrado. ` +
      'Ningún local, evento ni cuenta real se ha visto afectado.'
  )
}

main()
