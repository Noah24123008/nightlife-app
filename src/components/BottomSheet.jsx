import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Bottom sheet genérico: overlay con fundido, cierre al pulsar fuera o con
// Escape, y portal a document.body — el mismo patrón que ya usa
// CalendarPicker, extraído aquí como componente propio para no duplicarlo
// en cada sheet nuevo que haga falta a partir de ahora.
//
// noDescartable (opcional, por defecto false — no cambia nada para los
// usos ya existentes): cuando es true, oculta el botón "×" de cerrar. No
// afecta por sí solo al cierre por click fuera / Escape — eso lo decide
// quien use el componente pasando un onCerrar que sea un no-op, como ya
// hace AceptacionLegalModal.
export default function BottomSheet({ abierto, onCerrar, titulo, ariaLabel, children, noDescartable = false }) {
  const [renderizado, setRenderizado] = useState(false)

  // Mantener el sheet montado un instante más al cerrar, para que la
  // animación de salida (CSS) llegue a reproducirse antes de desmontar.
  useEffect(() => {
    if (abierto) {
      setRenderizado(true)
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

  function handleClickOverlay(e) {
    if (e.target === e.currentTarget) onCerrar()
  }

  if (!renderizado) return null

  return createPortal(
    <div className={`bottom-sheet-overlay ${abierto ? 'bottom-sheet-overlay--visible' : ''}`} onClick={handleClickOverlay}>
      <div
        className={`bottom-sheet ${abierto ? 'bottom-sheet--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <div className="bottom-sheet-handle" aria-hidden="true" />
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-titulo">{titulo}</h2>
          {!noDescartable && (
            <button type="button" className="bottom-sheet-cerrar" onClick={onCerrar} aria-label="Cerrar">
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
