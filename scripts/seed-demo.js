// Script de desarrollo: crea usuarios demo reales en Supabase Auth (vía
// Admin API), sus perfiles, votos de hoy y algunos seguimientos de ejemplo.
//
// USO:
//   node scripts/seed-demo.js
//
// Requiere en tu .env (nunca en src/, nunca con prefijo VITE_):
//   SUPABASE_URL=...                  (o reutiliza VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY=...     (Project Settings > API > service_role)

import 'dotenv/config'
import { randomUUID } from 'node:crypto'
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

const DOMINIO_DEMO = 'nightlife-demo.example.com'
const PASSWORD_DEMO = `Demo-${randomUUID().slice(0, 8)}!` // fija para esta ejecución; ver aviso al final

const USUARIOS_DEMO = [
  { usuario: 'lucia_demo', nombre: 'Lucía' },
  { usuario: 'mario_demo', nombre: 'Mario' },
  { usuario: 'sara_demo', nombre: 'Sara' },
  { usuario: 'pablo_demo', nombre: 'Pablo' },
  { usuario: 'alba_demo', nombre: 'Alba' },
  { usuario: 'dani_demo', nombre: 'Dani' },
  { usuario: 'carla_demo', nombre: 'Carla' },
  { usuario: 'hugo_demo', nombre: 'Hugo' },
  { usuario: 'laura_demo', nombre: 'Laura' },
  { usuario: 'adrian_demo', nombre: 'Adrián' },
  { usuario: 'sofia_demo', nombre: 'Sofía' },
  { usuario: 'martin_demo', nombre: 'Martín' },
]

// Ajusta estos nombres para que coincidan (sin distinguir mayúsculas) con
// locales REALES y activos de tu tabla `locales`. Si alguno no se encuentra,
// el script avisa y lo salta sin romper el resto.
const DISTRIBUCION_VOTOS = [
  { local: 'Boulevard', cantidad: 5 },
  { local: 'Bellavista', cantidad: 3 },
  { local: 'La Habana', cantidad: 2 },
  { local: 'Moon', cantidad: 1 },
  { local: 'Mavericks', cantidad: 1 },
]

// Seguimientos de ejemplo (índices sobre USUARIOS_DEMO), para poder probar
// feed social, seguidores/seguidos y notificaciones.
const SEGUIMIENTOS_DEMO = [
  [0, 1], [0, 2], [1, 2], [3, 0], [4, 0], [4, 1],
  [5, 6], [6, 7], [8, 0], [9, 1], [10, 2], [11, 3],
]

async function crearUsuarios() {
  const creados = []
  for (const { usuario, nombre } of USUARIOS_DEMO) {
    const email = `${usuario}@${DOMINIO_DEMO}`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD_DEMO,
      email_confirm: true,
      user_metadata: { nombre, demo: true },
    })
    if (error) {
      console.error(`✗ ${usuario}: ${error.message}`)
      continue
    }
    creados.push({ id: data.user.id, usuario, nombre })
    console.log(`✓ Usuario creado: ${usuario} (${data.user.id})`)
  }
  return creados
}

async function completarNombresDeUsuario(creados) {
  // El trigger handle_new_user ya rellena "nombre" y "email" a partir de los
  // metadatos al crear el usuario; aquí solo falta nombre_usuario.
  for (const u of creados) {
    const { error } = await admin.from('profiles').update({ nombre_usuario: u.usuario }).eq('id', u.id)
    if (error) console.error(`✗ nombre_usuario de ${u.usuario}: ${error.message}`)
  }
  console.log('✓ nombre_usuario asignado a todos los perfiles')
}

async function repartirVotos(creados) {
  const hoy = new Date().toISOString().slice(0, 10)
  let cursor = 0

  for (const { local, cantidad } of DISTRIBUCION_VOTOS) {
    const { data: localData, error: errLocal } = await admin
      .from('locales')
      .select('id, nombre')
      .ilike('nombre', local)
      .eq('activo', true)
      .maybeSingle()

    if (errLocal || !localData) {
      console.warn(`⚠ No se encontró un local activo llamado "${local}", se omite (${cantidad} votos sin asignar).`)
      cursor += cantidad
      continue
    }

    for (let i = 0; i < cantidad && cursor < creados.length; i++, cursor++) {
      const u = creados[cursor]
      const { error } = await admin
        .from('votos')
        .upsert({ usuario_id: u.id, local_id: localData.id, fecha: hoy }, { onConflict: 'usuario_id,fecha' })
      if (error) console.error(`✗ Voto de ${u.usuario} -> ${localData.nombre}: ${error.message}`)
      else console.log(`✓ ${u.usuario} va hoy a ${localData.nombre}`)
    }
  }
}

async function crearSeguimientos(creados) {
  for (const [iSeguidor, iSeguido] of SEGUIMIENTOS_DEMO) {
    const seguidor = creados[iSeguidor]
    const seguido = creados[iSeguido]
    if (!seguidor || !seguido || seguidor.id === seguido.id) continue

    const { error } = await admin
      .from('seguimientos')
      .upsert({ seguidor_id: seguidor.id, seguido_id: seguido.id }, { onConflict: 'seguidor_id,seguido_id' })
    if (error) console.error(`✗ ${seguidor.usuario} -> ${seguido.usuario}: ${error.message}`)
    else console.log(`✓ ${seguidor.usuario} sigue a ${seguido.usuario}`)
  }
}

async function main() {
  console.log('Creando usuarios demo...\n')
  const creados = await crearUsuarios()
  if (creados.length === 0) {
    console.error('\nNo se creó ningún usuario. Abortando.')
    process.exit(1)
  }

  console.log('\nCompletando nombre_usuario...')
  await completarNombresDeUsuario(creados)

  console.log('\nRepartiendo votos de hoy...')
  await repartirVotos(creados)

  console.log('\nCreando seguimientos de ejemplo...')
  await crearSeguimientos(creados)

  console.log(`\nListo: ${creados.length} usuarios demo creados.`)
  console.log(`Si quieres iniciar sesión como cualquiera de ellos: {usuario}@${DOMINIO_DEMO} / ${PASSWORD_DEMO}`)
  console.log('Para borrarlos todos más adelante: node scripts/cleanup-demo.js')
}

main()
