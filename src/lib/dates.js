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

// Máximo de días hacia el futuro que se puede seleccionar (~6 meses), tanto
// en el calendario como al restaurar una fecha desde la URL.
export const MAX_DIAS_FUTURO = 186

const DIAS_SEMANA_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

// Compara por fecha real (no por posición en el array) para que "Hoy" y
// "Mañana" sigan siendo correctos aunque la ventana visible no empiece en
// hoy (por ejemplo, al saltar a una fecha lejana con el calendario).
function etiquetaDia(fecha, hoy) {
  const fISO = toISODate(fecha)
  if (fISO === toISODate(hoy)) return 'Hoy'
  if (fISO === toISODate(addDays(hoy, 1))) return 'Mañana'
  const diaSemana = DIAS_SEMANA_CORTOS[fecha.getDay()]
  const mes = MESES_CORTOS[fecha.getMonth()]
  return `${diaSemana} ${fecha.getDate()} ${mes}`
}

// Genera una ventana de "cantidad" días. Por defecto (sin fechaAncla, o con
// fechaAncla = hoy) se comporta exactamente igual que antes: empieza en hoy.
// Con una fechaAncla distinta (p. ej. una fecha elegida en el calendario),
// centra la ventana alrededor de esa fecha, sin mostrar nunca días
// anteriores a hoy (se recorta el inicio si haría falta retroceder más).
export function buildDiasVisibles(hoy, cantidad = 5, fechaAncla = hoy) {
  const mitad = Math.floor(cantidad / 2)
  let inicio = addDays(fechaAncla, -mitad)
  if (toISODate(inicio) < toISODate(hoy)) {
    inicio = hoy
  }
  return Array.from({ length: cantidad }, (_, index) => {
    const fecha = addDays(inicio, index)
    return {
      fecha,
      fechaISO: toISODate(fecha),
      etiqueta: etiquetaDia(fecha, hoy),
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
// Compara la fecha directamente contra hoy/mañana (el segundo parámetro,
// heredado de cuando se basaba en el índice del array, ya no se usa; se
// mantiene solo para no romper las llamadas existentes que aún lo pasan).
export function etiquetaDiaTexto(fecha) {
  const hoy = new Date()
  const fISO = toISODate(fecha)
  if (fISO === toISODate(hoy)) return 'hoy'
  if (fISO === toISODate(addDays(hoy, 1))) return 'mañana'
  const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' })
  return `el ${diaSemana}`
}
