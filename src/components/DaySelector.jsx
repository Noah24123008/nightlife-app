import { useEffect, useRef, useState } from 'react'

export default function DaySelector({ dias, indiceSeleccionado, onSeleccionar }) {
  const scrollRef = useRef(null)
  const [puedeIzquierda, setPuedeIzquierda] = useState(false)
  const [puedeDerecha, setPuedeDerecha] = useState(false)

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

  return (
    <div className="day-selector-envoltorio">
      {puedeIzquierda && (
        <button
          type="button"
          className="day-selector-flecha day-selector-flecha--izquierda"
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
            className={`day-pill ${index === indiceSeleccionado ? 'day-pill--activo' : ''}`}
            onClick={() => onSeleccionar(index)}
          >
            {dia.etiqueta}
          </button>
        ))}
      </div>

      {puedeDerecha && (
        <button
          type="button"
          className="day-selector-flecha day-selector-flecha--derecha"
          onClick={() => desplazar(1)}
          aria-label="Días siguientes"
        >
          ›
        </button>
      )}
    </div>
  )
}
