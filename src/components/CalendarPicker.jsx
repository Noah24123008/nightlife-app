import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addDays, toISODate } from '../lib/dates'

const DIAS_SEMANA_CORTOS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const DIAS_SEMANA_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function inicioDeMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

// Cuadrícula de 42 celdas (6 semanas x 7 días), empezando en lunes, con
// margen suficiente para cubrir cualquier mes incluyendo días de los meses
// adyacentes que rellenan la primera/última semana.
function generarCeldas(mesVisible) {
  const primerDiaMes = inicioDeMes(mesVisible)
  const offsetLunes = (primerDiaMes.getDay() + 6) % 7
  const inicioGrid = addDays(primerDiaMes, -offsetLunes)
  return Array.from({ length: 42 }, (_, i) => addDays(inicioGrid, i))
}

export default function CalendarPicker({
  abierto,
  fechaSeleccionadaISO,
  fechaMinISO,
  fechaMaxISO,
  onSeleccionarFecha,
  onCerrar,
}) {
  const [renderizado, setRenderizado] = useState(false)
  const [mesVisible, setMesVisible] = useState(() => inicioDeMes(new Date(`${fechaSeleccionadaISO}T00:00:00`)))
  const sheetRef = useRef(null)

  // Mantener el sheet montado un instante más al cerrar, para que la
  // animación de salida (CSS) llegue a reproducirse antes de desmontar.
  useEffect(() => {
    if (abierto) {
      setRenderizado(true)
      setMesVisible(inicioDeMes(new Date(`${fechaSeleccionadaISO}T00:00:00`)))
    } else if (renderizado) {
      const temporizador = setTimeout(() => setRenderizado(false), 250)
      return () => clearTimeout(temporizador)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [abierto, onCerrar])

  const mesMinimo = useMemo(() => inicioDeMes(new Date(`${fechaMinISO}T00:00:00`)), [fechaMinISO])
  const mesMaximo = useMemo(() => inicioDeMes(new Date(`${fechaMaxISO}T00:00:00`)), [fechaMaxISO])

  const celdas = useMemo(() => generarCeldas(mesVisible), [mesVisible])
  const hoyISO = useMemo(() => toISODate(new Date()), [])

  const puedeMesAnterior = mesVisible > mesMinimo
  const puedeMesSiguiente = mesVisible < mesMaximo

  function irMesAnterior() {
    if (puedeMesAnterior) setMesVisible((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function irMesSiguiente() {
    if (puedeMesSiguiente) setMesVisible((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  function handleClickOverlay(e) {
    if (e.target === e.currentTarget) onCerrar()
  }

  if (!renderizado) return null

  const fechaResumen = new Date(`${fechaSeleccionadaISO}T00:00:00`)
  const textoResumen = `${capitalizar(DIAS_SEMANA_LARGOS[fechaResumen.getDay()])}, ${fechaResumen.getDate()} de ${
    MESES_LARGOS[fechaResumen.getMonth()]
  } de ${fechaResumen.getFullYear()}`

  return createPortal(
    <div
      className={`calendar-picker-overlay ${abierto ? 'calendar-picker-overlay--visible' : ''}`}
      onClick={handleClickOverlay}
    >
      <div
        ref={sheetRef}
        className={`calendar-picker-sheet ${abierto ? 'calendar-picker-sheet--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Selecciona una fecha"
      >
        <div className="calendar-picker-handle" aria-hidden="true" />

        <div className="calendar-picker-header">
          <div>
            <h2 className="calendar-picker-titulo">Selecciona una fecha</h2>
            <p className="calendar-picker-subtitulo">Elige el día que quieres ver</p>
          </div>
          <button type="button" className="calendar-picker-cerrar" onClick={onCerrar} aria-label="Cerrar calendario">
            ×
          </button>
        </div>

        <div className="calendar-picker-superficie">
          <div className="calendar-picker-mes-nav">
            <button
              type="button"
              className="calendar-picker-mes-btn"
              onClick={irMesAnterior}
              disabled={!puedeMesAnterior}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <span className="calendar-picker-mes-titulo">
              {capitalizar(MESES_LARGOS[mesVisible.getMonth()])} {mesVisible.getFullYear()}
            </span>
            <button
              type="button"
              className="calendar-picker-mes-btn"
              onClick={irMesSiguiente}
              disabled={!puedeMesSiguiente}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>

          <div className="calendar-picker-dias-semana">
            {DIAS_SEMANA_CORTOS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="calendar-picker-grid">
            {celdas.map((fecha) => {
              const fechaISO = toISODate(fecha)
              const enMesActual = fecha.getMonth() === mesVisible.getMonth()
              const esHoy = fechaISO === hoyISO
              const esSeleccionado = fechaISO === fechaSeleccionadaISO
              const deshabilitado = !enMesActual || fechaISO < fechaMinISO || fechaISO > fechaMaxISO

              return (
                <button
                  key={fechaISO}
                  type="button"
                  className={[
                    'calendar-picker-dia',
                    !enMesActual && 'calendar-picker-dia--fuera-de-mes',
                    esHoy && !esSeleccionado && 'calendar-picker-dia--hoy',
                    esSeleccionado && 'calendar-picker-dia--seleccionado',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={deshabilitado}
                  onClick={() => onSeleccionarFecha(fechaISO)}
                  aria-label={fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  aria-current={esSeleccionado ? 'date' : undefined}
                >
                  {fecha.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        <p className="calendar-picker-resumen">
          <span aria-hidden="true">📅</span> {textoResumen}
        </p>
      </div>
    </div>,
    document.body
  )
}
