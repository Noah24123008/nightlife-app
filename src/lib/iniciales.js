// "Jorge Pérez" -> JP · "Lucía" -> L · sin nombre -> primera letra del
// username · sin ninguno de los dos -> "?"
export function iniciales(persona) {
  const nombre = persona?.nombre?.trim()
  if (nombre) {
    const partes = nombre.split(/\s+/).filter(Boolean)
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
    return partes[0][0].toUpperCase()
  }
  const usuario = persona?.nombre_usuario?.trim()
  if (usuario) return usuario[0].toUpperCase()
  return '?'
}
