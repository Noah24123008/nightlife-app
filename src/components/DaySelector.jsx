import { useEffect, useRef, useState } from 'react'
import CalendarPicker from './CalendarPicker'

export default function DaySelector({
  dias,
  indiceSeleccionado,
  onSeleccionar,
  onSeleccionarFecha,
  fechaMinISO,
  fechaMaxISO,
}) {
  const scrollRef = useRef(null)
  const [puedeIzquierda, setPuedeIzquierda] = useState(false)
  const [puedeDerecha, setPuedeDerecha] = useState(false)
  const [calendarioAbierto, setCalendarioAbierto] = useState(false)

  function actualizarFlechas() {
    const el = scrollRef.current
    if (!el) return
    setPuedeIzquierda(el.scrollLeft > 4)
    setPuedeDerecha(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    actualizarFlechas()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', actualizarFlechas, { passive: true })
    window.addEventListener('resize', actualizarFlechas)
    return () => {
      el.removeEventListener('scroll', actualizarFlechas)
      window.removeEventListener('resize', actualizarFlechas)
    }
  }, [dias])

  function desplazar(direccion) {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direccion * 160, behavior: 'smooth' })
  }

  // El botón de calendario es opcional: si la pantalla que usa DaySelector
  // no pasa onSeleccionarFecha (como Social, sin cambios en esta fase), no
  // se renderiza nada nuevo y el componente se comporta exactamente igual
  // que antes.
  function handleSeleccionarFechaCalendario(fechaISO) {
    onSeleccionarFecha(fechaISO)
    setCalendarioAbierto(false)
  }

  return (
    <div className="day-selector-envoltorio">
      {puedeIzquierda && (
        <button
          type="button"
          className="glass-icon-btn day-selector-flecha day-selector-flecha--izquierda"
          onClick={() => desplazar(-1)}
          aria-label="Días anteriores"
        >
          ‹
        </button>
      )}

      <div className="day-selector" ref={scrollRef}>
        {dias.map((dia, index) => (
          <button
            key={dia.fechaISO}
            type="button"
            className={`glass-chip ${index === indiceSeleccionado ? 'glass-chip--active' : ''}`}
            onClick={() => onSeleccionar(index)}
          >
            {dia.etiqueta}
          </button>
        ))}
      </div>

      {puedeDerecha && (
        <button
          type="button"
          className="glass-icon-btn day-selector-flecha day-selector-flecha--derecha"
          onClick={() => desplazar(1)}
          aria-label="Días siguientes"
        >
          ›
        </button>
      )}

      {onSeleccionarFecha && (
        <>
          <button
            type="button"
            className="glass-icon-btn day-selector-calendario"
            onClick={() => setCalendarioAbierto(true)}
            aria-label="Elegir fecha en el calendario"
            aria-haspopup="dialog"
            aria-expanded={calendarioAbierto}
          >
            📅
          </button>
          <CalendarPicker
            abierto={calendarioAbierto}
            fechaSeleccionadaISO={dias[indiceSeleccionado]?.fechaISO}
            fechaMinISO={fechaMinISO}
            fechaMaxISO={fechaMaxISO}
            onSeleccionarFecha={handleSeleccionarFechaCalendario}
            onCerrar={() => setCalendarioAbierto(false)}
          />
        </>
      )}
    </div>
  )
}
