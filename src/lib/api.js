import { supabase } from './supabaseClient'

export async function getCiudadPorNombre(nombre) {
  const { data, error } = await supabase
    .from('ciudades')
    .select('id, nombre')
    .eq('nombre', nombre)
    .single()
  return { data, error }
}

export async function getLocalesPorCiudad(ciudadId) {
  const { data, error } = await supabase
    .from('locales')
    .select('id, nombre, categoria, direccion, foto_url, latitud, longitud')
    .eq('ciudad_id', ciudadId)
    .eq('activo', true)
  return { data, error }
}

export async function getLocalPorId(id) {
  const { data, error } = await supabase
    .from('locales')
    .select('id, nombre, categoria, direccion, horario, descripcion, foto_url')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function getEventosDeLocal(localId, fechaDesdeISO) {
  const { data, error } = await supabase
    .from('eventos')
    .select('id, nombre, descripcion, fecha, hora_inicio, hora_fin, foto_url')
    .eq('local_id', localId)
    .eq('activo', true)
    .gte('fecha', fechaDesdeISO)
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })
  return { data, error }
}

export async function getEventoPorId(id) {
  const { data, error } = await supabase
    .from('eventos')
    .select('id, nombre, descripcion, fecha, hora_inicio, hora_fin, foto_url, locales(id, nombre, direccion)')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function getVotosDelDia(fechaISO) {
  const { data, error } = await supabase
    .from('votos')
    .select('usuario_id, local_id, evento_id')
    .eq('fecha', fechaISO)
  return { data, error }
}

// A diferencia de getVotosDelDia (todos los votos del día, para ranking y
// contadores), esta consulta va filtrada por usuario_id en el propio
// where, así que la respuesta solo puede contener el voto del propio
// usuario, nunca el de nadie más — útil para saber "¿ya soy una de las
// personas contadas aquí?" sin revelar ninguna otra identidad.
export async function getMiVotoDelDia(usuarioId, fechaISO) {
  const { data, error } = await supabase
    .from('votos')
    .select('local_id, evento_id')
    .eq('usuario_id', usuarioId)
    .eq('fecha', fechaISO)
    .maybeSingle()
  return { data, error }
}

// Perfil público: solo trae campos no sensibles, vía la función de Supabase
// que los limita explícitamente (nunca email, nunca otros datos internos).
export async function getPerfilPublico(id) {
  const { data, error } = await supabase.rpc('get_perfil_publico', { perfil_id: id })
  return { data: data?.[0] ?? null, error }
}

export async function getPerfilesPublicos(ids) {
  if (!ids || ids.length === 0) return { data: [], error: null }
  const { data, error } = await supabase.rpc('get_perfiles_publicos', { perfil_ids: ids })
  return { data: data ?? [], error }
}

export async function getPersonasQueVanHoy({ localId = null, eventoId = null, fecha } = {}) {
  const params = { p_local_id: localId, p_evento_id: eventoId }
  if (fecha) params.p_fecha = fecha
  const { data, error } = await supabase.rpc('get_personas_que_van_hoy', params)
  return { data: data ?? [], error }
}

export async function compruebaSiSigo(seguidorId, seguidoId) {
  const { data, error } = await supabase
    .from('seguimientos')
    .select('seguidor_id')
    .eq('seguidor_id', seguidorId)
    .eq('seguido_id', seguidoId)
    .maybeSingle()
  return { siguiendo: !!data, error }
}

export async function seguirUsuario(seguidorId, seguidoId) {
  const { error } = await supabase
    .from('seguimientos')
    .insert({ seguidor_id: seguidorId, seguido_id: seguidoId })
  return { error }
}

export async function dejarDeSeguirUsuario(seguidorId, seguidoId) {
  const { error } = await supabase
    .from('seguimientos')
    .delete()
    .eq('seguidor_id', seguidorId)
    .eq('seguido_id', seguidoId)
  return { error }
}

export async function contarSeguidores(usuarioId) {
  const { count, error } = await supabase
    .from('seguimientos')
    .select('*', { count: 'exact', head: true })
    .eq('seguido_id', usuarioId)
  return { count: count ?? 0, error }
}

export async function contarSeguidos(usuarioId) {
  const { count, error } = await supabase
    .from('seguimientos')
    .select('*', { count: 'exact', head: true })
    .eq('seguidor_id', usuarioId)
  return { count: count ?? 0, error }
}

// Listas de seguidores/seguidos en una sola llamada segura (ver migración
// 0007): unen seguimientos con profiles en el propio SQL y solo devuelven
// campos públicos.
export async function getSeguidores(usuarioId) {
  const { data, error } = await supabase.rpc('get_seguidores', { usuario_id: usuarioId })
  return { data: data ?? [], error }
}

export async function getSeguidos(usuarioId) {
  const { data, error } = await supabase.rpc('get_seguidos', { usuario_id: usuarioId })
  return { data: data ?? [], error }
}

// --- Sistema de amistad (solicitudes_amistad) ---
// seguirUsuario/dejarDeSeguirUsuario/compruebaSiSigo/contarSeguidores/
// contarSeguidos/getSeguidores/getSeguidos (arriba) se quedan sin usar
// desde el frontend nuevo, pero no se borran.

export async function enviarSolicitudAmistad(destinatarioId) {
  const { error } = await supabase.rpc('enviar_solicitud_amistad', { p_destinatario: destinatarioId })
  return { error }
}

export async function responderSolicitudAmistad(solicitudId, aceptar) {
  const { error } = await supabase.rpc('responder_solicitud_amistad', {
    p_solicitud_id: solicitudId,
    p_aceptar: aceptar,
  })
  return { error }
}

// Relación entre usuarioId y otroId, en cualquiera de las dos direcciones.
// Como mucho puede existir una fila para esa pareja (restricción única de
// solicitudes_amistad), así que "no hay relación" es un resultado válido
// (data: null), no un error.
export async function consultarRelacionAmistad(usuarioId, otroId) {
  const { data, error } = await supabase
    .from('solicitudes_amistad')
    .select('id, usuario_solicitante_id, usuario_receptor_id, estado')
    .or(
      `and(usuario_solicitante_id.eq.${usuarioId},usuario_receptor_id.eq.${otroId}),and(usuario_solicitante_id.eq.${otroId},usuario_receptor_id.eq.${usuarioId})`
    )
    .maybeSingle()
  return { data, error }
}

// Sirve tanto para cancelar una solicitud propia como para eliminar una
// amistad ya aceptada: la policy de RLS decide qué se permite según el
// estado de la fila y quién la llama.
export async function eliminarRelacionAmistad(solicitudId) {
  const { error } = await supabase.from('solicitudes_amistad').delete().eq('id', solicitudId)
  return { error }
}

export async function getAmigos(usuarioId) {
  const { data, error } = await supabase.rpc('get_amigos', { p_usuario_id: usuarioId })
  return { data: data ?? [], error }
}

export async function buscarPerfilesPublicos(termino) {
  const limpio = termino.trim().replace(/^@/, '')
  if (limpio.length < 2) return { data: [], error: null }
  const { data, error } = await supabase.rpc('buscar_perfiles_publicos', { termino: limpio })
  return { data: data ?? [], error }
}

export async function getFeedSocialHoy(fecha) {
  const params = {}
  if (fecha) params.p_fecha = fecha
  const { data, error } = await supabase.rpc('get_feed_social_hoy', params)
  return { data: data ?? [], error }
}

export async function getNotificaciones() {
  const { data, error } = await supabase.rpc('get_notificaciones')
  return { data: data ?? [], error }
}

export async function getDondeVaLaGenteHoy(fecha) {
  const params = {}
  if (fecha) params.p_fecha = fecha
  const { data, error } = await supabase.rpc('get_donde_va_la_gente_hoy', params)
  return { data: data ?? [], error }
}

export async function getRecomendacionesSocialesHoy(fecha) {
  const params = {}
  if (fecha) params.p_fecha = fecha
  const { data, error } = await supabase.rpc('get_recomendaciones_sociales_hoy', params)
  return { data: data ?? [], error }
}

export async function getNumeroNotificacionesNoLeidas() {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('leida', false)
  return { count: count ?? 0, error }
}

export async function marcarNotificacionLeida(id) {
  const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
  return { error }
}

export async function marcarTodasNotificacionesLeidas() {
  const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('leida', false)
  return { error }
}

export async function getEventosDelDia(ciudadId, fechaISO) {
  const { data, error } = await supabase
    .from('eventos')
    .select('id, nombre, descripcion, hora_inicio, hora_fin, foto_url, locales!inner(id, nombre, ciudad_id)')
    .eq('fecha', fechaISO)
    .eq('activo', true)
    .eq('locales.ciudad_id', ciudadId)
    .order('hora_inicio', { ascending: true })
  return { data, error }
}

// Un único voto activo por usuario y día: el upsert usa la restricción
// (usuario_id, fecha) ya definida en la base de datos, así que esta misma
// llamada sirve tanto para el primer voto del día como para cambiarlo.
export async function votarPorLocal({ usuarioId, localId, fecha, eventoId = null }) {
  const { error } = await supabase
    .from('votos')
    .upsert(
      { usuario_id: usuarioId, local_id: localId, fecha, evento_id: eventoId },
      { onConflict: 'usuario_id,fecha' }
    )
  return { error }
}

// Carga el perfil del usuario autenticado. Si no existiera todavía (el alta
// normal ya lo crea vía trigger, esto es solo un respaldo), lo crea de forma
// segura: el upsert solo puede afectar a la fila cuyo id sea auth.uid(),
// según las políticas RLS de profiles.
export async function getOCrearPerfil(userId, email) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email }, { onConflict: 'id' })
    .select('id, nombre, nombre_usuario, email, foto_url')
    .single()
  return { data, error }
}

export async function guardarPerfil(userId, cambios) {
  const { data, error } = await supabase
    .from('profiles')
    .update(cambios)
    .eq('id', userId)
    .select('id, nombre, nombre_usuario, email, foto_url')
    .single()
  return { data, error }
}

const BUCKET_AVATARES = 'avatares'
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANIO_MAXIMO = 5 * 1024 * 1024 // 5 MB

export function validarImagenAvatar(archivo) {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return 'Formato no permitido. Usa JPG, PNG o WEBP.'
  }
  if (archivo.size > TAMANIO_MAXIMO) {
    return 'La imagen no puede superar los 5 MB.'
  }
  return null
}

// Sube la foto de perfil a Storage y elimina cualquier foto anterior del
// usuario (aunque tuviera otra extensión) para no acumular archivos.
export async function subirAvatar(userId, archivo) {
  const extension = archivo.name.split('.').pop().toLowerCase()
  const ruta = `${userId}/avatar.${extension}`

  const { data: existentes } = await supabase.storage.from(BUCKET_AVATARES).list(userId)
  if (existentes && existentes.length > 0) {
    const rutasAntiguas = existentes.map((archivoExistente) => `${userId}/${archivoExistente.name}`)
    await supabase.storage.from(BUCKET_AVATARES).remove(rutasAntiguas)
  }

  const { error: errSubida } = await supabase.storage
    .from(BUCKET_AVATARES)
    .upload(ruta, archivo, { upsert: true, contentType: archivo.type })

  if (errSubida) return { url: null, error: errSubida }

  const { data } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(ruta)
  // Parámetro de caché: la ruta del archivo es siempre la misma, así que sin
  // esto el navegador podría seguir mostrando la imagen anterior en caché.
  const url = `${data.publicUrl}?v=${Date.now()}`
  return { url, error: null }
}
