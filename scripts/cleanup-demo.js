// Script de desarrollo: borra ÚNICAMENTE los usuarios creados por
// seed-demo.js (identificados por user_metadata.demo === true), y con ellos
// sus perfiles, votos, seguimientos y notificaciones (vía ON DELETE CASCADE).
// Nunca toca cuentas reales, porque solo actúa sobre ese marcador exacto.
//
// USO:
//   node scripts/cleanup-demo.js --dry-run   (solo lista, no borra nada)
//   node scripts/cleanup-demo.js             (borra de verdad)

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

async function listarUsuariosDemo() {
  const demo = []
  let pagina = 1
  const porPagina = 200

  // Paginamos por si hay más usuarios que el tamaño de página.
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

  return demo
}

async function main() {
  const usuariosDemo = await listarUsuariosDemo()

  if (usuariosDemo.length === 0) {
    console.log('No hay usuarios demo que borrar.')
    return
  }

  console.log(`Usuarios demo encontrados (${usuariosDemo.length}):`)
  usuariosDemo.forEach((u) => console.log(`  - ${u.email} (${u.id})`))

  if (dryRun) {
    console.log('\n--dry-run: no se ha borrado nada. Ejecuta sin --dry-run para borrarlos de verdad.')
    return
  }

  console.log('\nBorrando...')
  for (const u of usuariosDemo) {
    const { error } = await admin.auth.admin.deleteUser(u.id)
    if (error) console.error(`✗ ${u.email}: ${error.message}`)
    else console.log(`✓ Borrado: ${u.email}`)
  }

  console.log(
    '\nListo. profiles, votos, seguimientos y notificaciones asociados se han borrado automáticamente (ON DELETE CASCADE).'
  )
}

main()
