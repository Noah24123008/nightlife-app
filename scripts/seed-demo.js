// Script de demo — v2: reutiliza y amplía el sistema ya existente (mismos
// marcadores, misma convención de email, mismo mecanismo de identificación
// que ya usaba la versión original de 12 usuarios). No es una arquitectura
// paralela: es el mismo sistema, escalado y modernizado.
//
// AUDITORÍA REALIZADA ANTES DE ESCRIBIR ESTE SCRIPT (ver informe adjunto
// para el detalle completo):
//   - profiles.id, votos.usuario_id, solicitudes_amistad.usuario_*_id y
//     notificaciones.usuario_id/actor_id referencian todos auth.users(id)
//     con ON DELETE CASCADE ya desde las migraciones originales — borrar un
//     usuario Auth limpia en cascada su perfil, sus votos, sus amistades
//     (en ambas direcciones) y sus notificaciones. No hace falta borrar
//     nada de eso a mano.
//   - notificaciones.solicitud_amistad_id también referencia
//     solicitudes_amistad(id) on delete cascade: al borrar una amistad
//     demo (por cascada, al borrar el usuario), cualquier notificación
//     asociada a ella también desaparece sola.
//   - Insertar solicitudes_amistad directamente con estado='aceptada'
//     (en vez de pasar por pendiente -> responder) NO dispara los
//     triggers de notificación de amistad: notificar_solicitud_amistad
//     solo actúa cuando new.estado = 'pendiente' en un INSERT, y
//     notificar_respuesta_solicitud_amistad solo actúa en un UPDATE
//     donde old.estado = 'pendiente'. Como aquí insertamos u
//     "actualizamos sin cambio real" (ya estaba en 'aceptada'), ninguna
//     de las dos condiciones se cumple: cero notificaciones de amistad
//     generadas por este script.
//   - votos SÍ tiene un trigger, notificar_voto_seguidores(), que se
//     dispara al votar HOY y notifica a los "seguidores" (tabla legacy
//     seguimientos) del votante. Los usuarios demo no tienen seguidores
//     ahí (nadie los sigue de forma legacy), así que ese trigger no
//     genera ninguna notificación real para los votos demo. No se ha
//     tocado esa tabla ni ese trigger.
//   - No hizo falta ninguna migración ni cambio de schema.
//
// USO:
//   node scripts/seed-demo.js
//
// Requiere en tu .env (nunca en src/, nunca con prefijo VITE_):
//   SUPABASE_URL=...                  (o reutiliza VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY=...     (Project Settings > API > service_role)
//
// Opcional pero recomendado, para la red de amigos demo:
//   DEMO_OWNER_USER_ID=...            UUID de tu cuenta de prueba real.
//   Si no se indica, el script sigue creando el resto de datos demo, pero
//   avisa claramente de que no creó ninguna amistad para tu cuenta.
//
// Otras variables opcionales:
//   DEMO_TOTAL=170          Objetivo de perfiles demo (rango pedido 150-180).
//   DEMO_NUM_AMIGOS=15      Cuántos son amigos aceptados de DEMO_OWNER_USER_ID.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_OWNER_USER_ID = process.env.DEMO_OWNER_USER_ID || null
const TOTAL_DEMO = Number(process.env.DEMO_TOTAL || 170)
const NUM_AMIGOS_DEMO = Number(process.env.DEMO_NUM_AMIGOS || 15)

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en tu .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DOMINIO_DEMO = 'nightlife-demo.example.com'
const PASSWORD_DEMO_PREFIJO = 'Demo-'

// ------------------------------------------------------------
// Fechas en Europe/Madrid — NO usamos new Date().toISOString(), que
// desplazaría el día según la hora UTC en la que se ejecute el script.
// Intl.DateTimeFormat con timeZone: 'Europe/Madrid' da el día de
// calendario correcto sin depender de la zona horaria del propio proceso
// Node, igual que la app usa (now() at time zone 'Europe/Madrid')::date
// en SQL para el mismo propósito.
// ------------------------------------------------------------

function fechaMadridISO(fecha) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(fecha)
}

function hoyEnMadrid() {
  // Fecha de calendario "sin hora", para poder hacer aritmética de días
  // con setDate/getDate de forma segura sin volver a tocar zonas horarias.
  return new Date(`${fechaMadridISO(new Date())}T00:00:00`)
}

function sumarDias(fechaCalendario, dias) {
  const resultado = new Date(fechaCalendario)
  resultado.setDate(resultado.getDate() + dias)
  return resultado
}

function aISO(fechaCalendario) {
  const y = fechaCalendario.getFullYear()
  const m = String(fechaCalendario.getMonth() + 1).padStart(2, '0')
  const d = String(fechaCalendario.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function proximoDiaSemana(desde, diaSemanaObjetivo) {
  // diaSemanaObjetivo: 0=domingo ... 6=sábado (igual que Date#getDay()).
  const diff = (diaSemanaObjetivo - desde.getDay() + 7) % 7 || 7
  return sumarDias(desde, diff)
}

// ------------------------------------------------------------
// Nombres/usernames sintéticos
// ------------------------------------------------------------

const NOMBRES = [
  'Lucía', 'Mario', 'Sara', 'Pablo', 'Alba', 'Dani', 'Carla', 'Hugo', 'Laura', 'Adrián',
  'Sofía', 'Martín', 'Elena', 'Diego', 'Marta', 'Álvaro', 'Nerea', 'Iván', 'Paula', 'Rubén',
  'Clara', 'Gonzalo', 'Irene', 'Marcos', 'Julia', 'Óscar', 'Noa', 'Raúl', 'Vera', 'Bruno',
  'Ana', 'Carlos', 'Beatriz', 'Sergio', 'Andrea', 'Fernando', 'Cristina', 'Javier', 'Rocío', 'Víctor',
  'Silvia', 'Alberto', 'Patricia', 'Ignacio', 'Miriam', 'Roberto', 'Natalia', 'Emilio', 'Celia', 'Damián',
  'Aitana', 'Samuel', 'Lidia', 'Gabriel', 'Nuria', 'Jorge', 'Blanca', 'Tomás', 'Eva', 'Guillermo',
  'Inés', 'Lorenzo', 'Marina', 'Enrique', 'Alicia', 'Felipe', 'Diana', 'Pedro', 'Isabel', 'Nicolás',
  'Olga', 'Ismael', 'Teresa', 'Cristian', 'Yolanda', 'Agustín', 'Vanesa', 'Rodrigo', 'Susana', 'Ariadna',
  'Manuel', 'Verónica', 'Alfonso', 'Gema', 'Esteban', 'Rosa', 'Jaime', 'Miren', 'Lucas', 'Amaia',
  'Antonio', 'Begoña', 'Francisco', 'Luz', 'Eduardo', 'Pilar', 'Salvador', 'Montse', 'Ricardo', 'Aroa',
]

// Genera "total" pares {usuario, nombre} únicos. Si el pool de nombres no
// llega, repite el pool añadiendo un sufijo numérico (lucia_demo,
// lucia2_demo, ...) para garantizar usernames distintos sin duplicar el
// primer lote ya existente.
function construirListaUsuarios(total) {
  const lista = []
  let vueltas = 0
  while (lista.length < total) {
    for (const nombre of NOMBRES) {
      if (lista.length >= total) break
      const base = nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const usuario = vueltas === 0 ? `${base}_demo` : `${base}${vueltas + 1}_demo`
      lista.push({ usuario, nombre })
    }
    vueltas++
  }
  return lista
}

// ------------------------------------------------------------
// Identificación / reutilización de usuarios demo existentes
// ------------------------------------------------------------

async function listarUsuariosDemoExistentes() {
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
  return demo
}

async function crearUsuariosFaltantes(existentes, objetivoTotal) {
  if (existentes.length >= objetivoTotal) {
    return { usuarios: existentes.map(mapearExistente), creados: 0 }
  }

  const usernamesExistentes = new Set(
    existentes.map((u) => u.user_metadata?.nombre_usuario || u.email?.split('@')[0]).filter(Boolean)
  )
  const candidatos = construirListaUsuarios(objetivoTotal + existentes.length) // margen por colisiones
  const faltan = objetivoTotal - existentes.length
  const nuevos = []
  const passwordDemo = `${PASSWORD_DEMO_PREFIJO}${Date.now()}!`

  for (const { usuario, nombre } of candidatos) {
    if (nuevos.length >= faltan) break
    if (usernamesExistentes.has(usuario)) continue

    const email = `${usuario}@${DOMINIO_DEMO}`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: passwordDemo,
      email_confirm: true,
      user_metadata: { nombre, demo: true, nombre_usuario: usuario },
    })
    if (error) {
      console.error(`✗ ${usuario}: ${error.message}`)
      continue
    }
    nuevos.push({ id: data.user.id, usuario, nombre })
    if (nuevos.length % 25 === 0) console.log(`  ... ${nuevos.length}/${faltan} usuarios nuevos creados`)
  }

  for (const u of nuevos) {
    const { error } = await admin.from('profiles').update({ nombre_usuario: u.usuario }).eq('id', u.id)
    if (error) console.error(`✗ nombre_usuario de ${u.usuario}: ${error.message}`)
  }

  if (nuevos.length > 0) {
    console.log(`  Contraseña de esta tanda de usuarios nuevos: ${passwordDemo}`)
  }

  return { usuarios: [...existentes.map(mapearExistente), ...nuevos], creados: nuevos.length }
}

function mapearExistente(u) {
  return { id: u.id, usuario: u.user_metadata?.nombre_usuario, nombre: u.user_metadata?.nombre }
}

// ------------------------------------------------------------
// Locales activos reales (nunca hardcodeados)
// ------------------------------------------------------------

async function obtenerLocalesActivos() {
  const { data, error } = await admin.from('locales').select('id, nombre').eq('activo', true)
  if (error || !data || data.length === 0) {
    console.error('No se pudieron obtener locales activos:', error?.message || '(ninguno encontrado)')
    process.exit(1)
  }
  return data
}

// ------------------------------------------------------------
// Fechas de la demo
// ------------------------------------------------------------

async function calcularFechasDemo() {
  const hoy = hoyEnMadrid()
  const fechas = [
    { fecha: aISO(hoy), etiqueta: 'hoy' },
    { fecha: aISO(sumarDias(hoy, 1)), etiqueta: 'mañana' },
    { fecha: aISO(proximoDiaSemana(hoy, 5)), etiqueta: 'próximo viernes' },
    { fecha: aISO(proximoDiaSemana(hoy, 6)), etiqueta: 'próximo sábado' },
  ]

  const { data: evento } = await admin
    .from('eventos')
    .select('id, nombre, fecha, local_id')
    .eq('activo', true)
    .gte('fecha', aISO(hoy))
    .order('fecha', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (evento) {
    fechas.push({
      fecha: evento.fecha,
      etiqueta: `evento "${evento.nombre}"`,
      eventoId: evento.id,
      eventoLocalId: evento.local_id,
    })
  } else {
    console.warn('⚠ No se encontró ningún evento activo futuro; se usa hoy+14 días como quinta fecha.')
    fechas.push({ fecha: aISO(sumarDias(hoy, 14)), etiqueta: 'fecha futura genérica' })
  }

  const vistas = new Set()
  return fechas.filter((f) => (vistas.has(f.fecha) ? false : vistas.add(f.fecha)))
}

// ------------------------------------------------------------
// Reparto de votos: pesos decrecientes con variación aleatoria, barajados
// por fecha para que el ranking cambie de un día a otro.
// ------------------------------------------------------------

function generarPesosLocales(locales) {
  const barajados = [...locales].sort(() => Math.random() - 0.5)
  return barajados.map((local, index) => ({
    local,
    peso: Math.max(65 * Math.pow(0.72, index), 3) * (0.75 + Math.random() * 0.5),
  }))
}

function elegirLocalPonderado(pesos) {
  const total = pesos.reduce((s, p) => s + p.peso, 0)
  let r = Math.random() * total
  for (const p of pesos) {
    r -= p.peso
    if (r <= 0) return p.local
  }
  return pesos[pesos.length - 1].local
}

// Reparte deliberadamente a los usuarios "amigos" entre los 2-3 locales con
// más peso de esa fecha (no todos al mismo sitio), para que "Quién va" y el
// total_amigos de cada local sean visualmente distintos entre sí y entre
// fechas — en vez de dejarlo puramente al azar, que podría concentrarlos
// todos en un único local por pura coincidencia.
function repartirAmigosEntreLocales(amigos, pesos) {
  const topLocales = [...pesos].sort((a, b) => b.peso - a.peso).slice(0, Math.min(3, pesos.length))
  const asignacion = new Map()
  // Reparto ponderado pero garantizando presencia en cada uno de los
  // topLocales elegidos, con algo de aleatoriedad en el orden.
  const orden = [...amigos].sort(() => Math.random() - 0.5)
  orden.forEach((amigoId, i) => {
    const destino = topLocales[i % topLocales.length].local
    asignacion.set(amigoId, destino)
  })
  return asignacion
}

async function generarVotos(usuarios, locales, fechas, idsAmigos) {
  const resumenPorFecha = []

  for (const f of fechas) {
    const pesos = generarPesosLocales(locales)
    const asignacionAmigos = idsAmigos.length > 0 ? repartirAmigosEntreLocales(idsAmigos, pesos) : new Map()
    const conteos = {}
    let insertados = 0

    for (const u of usuarios) {
      const local = asignacionAmigos.get(u.id) || elegirLocalPonderado(pesos)
      const eventoId = f.eventoId && local.id === f.eventoLocalId && Math.random() < 0.6 ? f.eventoId : null

      const { error } = await admin
        .from('votos')
        .upsert(
          { usuario_id: u.id, local_id: local.id, fecha: f.fecha, evento_id: eventoId },
          { onConflict: 'usuario_id,fecha' }
        )
      if (error) {
        console.error(`✗ Voto ${u.usuario} (${f.fecha}): ${error.message}`)
        continue
      }
      conteos[local.nombre] = (conteos[local.nombre] || 0) + 1
      insertados++
    }

    const ranking = Object.entries(conteos).sort((a, b) => b[1] - a[1])
    resumenPorFecha.push({ etiqueta: f.etiqueta, fecha: f.fecha, insertados, ranking })
  }

  return resumenPorFecha
}

// ------------------------------------------------------------
// Amistades demo con la cuenta real (DEMO_OWNER_USER_ID)
// ------------------------------------------------------------

async function crearAmistadesDemo(usuarios, ownerUserId, numAmigos) {
  if (!ownerUserId) return { creadas: 0, ids: [] }

  const elegidos = usuarios.slice(0, Math.min(numAmigos, usuarios.length))
  const ids = []
  for (const u of elegidos) {
    if (u.id === ownerUserId) continue
    const { error } = await admin.from('solicitudes_amistad').upsert(
      { usuario_solicitante_id: u.id, usuario_receptor_id: ownerUserId, estado: 'aceptada' },
      { onConflict: 'usuario_menor_id,usuario_mayor_id' }
    )
    if (error) {
      console.error(`✗ Amistad demo ${u.usuario}: ${error.message}`)
      continue
    }
    ids.push(u.id)
  }
  return { creadas: ids.length, ids }
}

// ------------------------------------------------------------
// main
// ------------------------------------------------------------

async function main() {
  console.log(`Objetivo: ${TOTAL_DEMO} perfiles demo (rango pedido 150-180), ${NUM_AMIGOS_DEMO} amigos de tu cuenta.\n`)

  if (!DEMO_OWNER_USER_ID) {
    console.warn(
      '⚠ DEMO_OWNER_USER_ID no está configurado en tu .env — se seguirá creando el resto de datos demo, ' +
        'pero NO se creará ninguna amistad para tu cuenta.\n'
    )
  }

  console.log('Buscando usuarios demo ya existentes...')
  const existentes = await listarUsuariosDemoExistentes()
  console.log(`  Encontrados: ${existentes.length}\n`)

  console.log('Creando los que falten...')
  const { usuarios, creados } = await crearUsuariosFaltantes(existentes, TOTAL_DEMO)
  console.log(`  Creados en esta ejecución: ${creados}\n`)

  console.log('Obteniendo locales activos reales...')
  const locales = await obtenerLocalesActivos()
  console.log(`  ${locales.length} locales activos: ${locales.map((l) => l.nombre).join(', ')}\n`)

  console.log('Calculando fechas (Europe/Madrid)...')
  const fechas = await calcularFechasDemo()
  fechas.forEach((f) => console.log(`  - ${f.etiqueta}: ${f.fecha}`))
  console.log('')

  console.log('Creando red de amigos demo...')
  const { creadas: amistadesCreadas, ids: idsAmigos } = await crearAmistadesDemo(
    usuarios,
    DEMO_OWNER_USER_ID,
    NUM_AMIGOS_DEMO
  )
  console.log(`  Amistades aceptadas creadas/confirmadas: ${amistadesCreadas}\n`)

  console.log('Generando votos por fecha...')
  const resumenVotos = await generarVotos(usuarios, locales, fechas, idsAmigos)
  console.log('')

  // ------------------------------------------------------------
  // Resumen final
  // ------------------------------------------------------------
  console.log('============================================================')
  console.log('RESUMEN')
  console.log('============================================================')
  console.log(`Usuarios demo encontrados: ${existentes.length}`)
  console.log(`Usuarios demo creados:     ${creados}`)
  console.log(`Total demo:                ${usuarios.length}`)
  console.log(`Amistades demo:            ${amistadesCreadas}${DEMO_OWNER_USER_ID ? '' : ' (DEMO_OWNER_USER_ID no configurado)'}`)
  console.log(`Fechas sembradas:          ${fechas.length}`)
  console.log('Votos por fecha:')
  for (const r of resumenVotos) {
    console.log(`  ${r.etiqueta} (${r.fecha}) — ${r.insertados} votos`)
    for (const [nombre, cantidad] of r.ranking) console.log(`      ${nombre}: ${cantidad}`)
  }
  console.log('============================================================')
  console.log('\nPara borrar todos los datos demo: node scripts/cleanup-demo.js --dry-run')
}

main()
