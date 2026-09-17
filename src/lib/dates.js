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

// ------------------------------------------------------------
// "Fecha nocturna": la fecha que representa la noche actual, no el día de
// calendario. 00:00–05:59 en Madrid pertenece todavía a la noche del día
// anterior; 06:00–23:59 pertenece a la noche de hoy. Es la ÚNICA fuente
// para "qué día es hoy" en toda la app (Inicio, /hoy, "Tus amigos hoy",
// "Quién va hoy", recomendaciones...) — nunca sustituye una fecha elegida
// explícitamente por el usuario (?fecha=... en la URL, o un día del
// calendario seleccionado a mano), que siguen intactas exactamente como
// llegan.
//
// Usa Intl.DateTimeFormat con timeZone: 'Europe/Madrid' — nativo del
// navegador, sin depender de la zona horaria del dispositivo, y con el
// cambio de horario verano/invierno ya resuelto por la propia base de
// datos IANA del motor (no hace falta ningún cálculo manual de DST aquí).
// ------------------------------------------------------------

const HORA_CORTE_NOCTURNO = 6

// Recibe un instante (por defecto, ahora mismo) y devuelve la fecha
// nocturna correspondiente en YYYY-MM-DD. Exportada con el instante como
// parámetro explícito para poder probar cualquier hora/fecha sin tener que
// esperar a que sea de madrugada de verdad.
// Hora actual en Madrid (0-23), independiente de la zona horaria del
// dispositivo. Compartida por calcularFechaNocturna y por
// estaEnFranjaNocturnaAhora, para no repetir la regla de zona horaria en
// dos sitios.
function horaActualEnMadrid(instante = new Date()) {
  const hora24 = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hour12: false,
  })
    .formatToParts(instante)
    .find((p) => p.type === 'hour').value
  // Intl con hour12:false puede devolver "24" para la medianoche exacta en
  // vez de "00" (comportamiento documentado del propio Intl, no un fallo) —
  // se normaliza para que la comparación numérica sea siempre correcta.
  const hora = Number(hora24)
  return hora === 24 ? 0 : hora
}

export function calcularFechaNocturna(instante = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante)

  const valor = (tipo) => partes.find((p) => p.type === tipo).value
  const anio = Number(valor('year'))
  const mes = Number(valor('month'))
  const dia = Number(valor('day'))
  const hora = horaActualEnMadrid(instante)

  // Se calcula en UTC "abstracto" (sin ligarlo a ningún instante real) para
  // que restar un día maneje solo por sí mismo los cambios de mes/año, sin
  // ningún efecto de zona horaria local que pudiera desplazar el resultado.
  const fechaCalendario = new Date(Date.UTC(anio, mes - 1, dia))
  if (hora < HORA_CORTE_NOCTURNO) {
    fechaCalendario.setUTCDate(fechaCalendario.getUTCDate() - 1)
  }
  return fechaCalendario.toISOString().slice(0, 10)
}

// Para el aviso "el día cambia a las 06:00" en Inicio — misma regla y mismo
// corte que la fecha nocturna, sin repetir el número: reutiliza tanto
// horaActualEnMadrid como HORA_CORTE_NOCTURNO.
export function estaEnFranjaNocturnaAhora(instante = new Date()) {
  return horaActualEnMadrid(instante) < HORA_CORTE_NOCTURNO
}

export function getFechaNocturnaActual() {
  return calcularFechaNocturna()
}

// Igual que getFechaNocturnaActual(), pero como objeto Date (medianoche
// local del dispositivo de esa fecha) — para los sitios que ya trabajan con
// buildDiasVisibles/addDays, que operan sobre Date, no sobre strings.
export function getFechaNocturnaActualComoDate() {
  return new Date(`${getFechaNocturnaActual()}T00:00:00`)
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
  const hoy = getFechaNocturnaActualComoDate()
  const fISO = toISODate(fecha)
  if (fISO === toISODate(hoy)) return 'hoy'
  if (fISO === toISODate(addDays(hoy, 1))) return 'mañana'
  const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' })
  return `el ${diaSemana}`
}
