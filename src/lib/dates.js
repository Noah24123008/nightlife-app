export function toISODate(date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export function addDays(date, dias) {
  const resultado = new Date(date)
  resultado.setDate(resultado.getDate() + dias)
  return resultado
}

function etiquetaDia(fecha, index) {
  if (index === 0) return 'Hoy'
  if (index === 1) return 'Mañana'
  return fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
}

export function buildDiasVisibles(hoy, cantidad = 5) {
  return Array.from({ length: cantidad }, (_, index) => {
    const fecha = addDays(hoy, index)
    return {
      fecha,
      fechaISO: toISODate(fecha),
      etiqueta: etiquetaDia(fecha, index),
    }
  })
}

export function formatearFechaLarga(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  return fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
}

// Etiqueta en minúscula pensada para insertarse dentro de una frase
// ("Dónde va la gente {etiquetaDiaTexto}"). Distinta de "etiqueta"
// (la de las pastillas del DaySelector, en mayúscula y más corta):
// son dos formatos para dos sitios distintos, no se sustituyen entre sí.
export function etiquetaDiaTexto(fecha, index) {
  if (index === 0) return 'hoy'
  if (index === 1) return 'mañana'
  const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' })
  return `el ${diaSemana}`
}
