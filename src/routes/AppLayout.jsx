import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

// Swipe horizontal entre las 4 pestañas principales, mismo orden que
// BottomNav. location.pathname sigue siendo la única fuente de verdad: no
// se guarda ningún índice de pestaña aparte, se lee en el momento de cada
// gesto — si no coincide exactamente con una de estas 4 rutas (p. ej.
// estamos en /locales/:id, /buscar, /mapa...), el swipe no hace nada.
const PESTANAS_SWIPE = ['/', '/locales', '/social', '/perfil']
const UMBRAL_PX = 70

// Elementos donde un gesto horizontal ya tiene un significado propio: campos
// de formulario/controles, cualquier enlace o botón (cubre prácticamente
// todas las tarjetas/filas pulsables, que son <a> vía <Link>), el carrusel
// de días (scroll horizontal propio) y el mapa embebido en Locales
// (arrastre propio de Leaflet). El calendario no necesita exclusión aquí:
// se renderiza con un portal a document.body, así que sus toques nunca son
// descendientes de este contenedor y nunca llegan a este listener.
const SELECTOR_EXCLUIDO = 'input, textarea, select, button, a, .day-selector, .mapa-contenedor'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const contenedorRef = useRef(null)
  const gestoRef = useRef(null)

  useEffect(() => {
    // Solo en dispositivos táctiles: touchstart/touchmove/touchend nunca
    // se disparan con ratón, así que ya queda naturalmente limitado a
    // móvil/táctil sin necesitar comprobar el ancho de pantalla.
    if (!('ontouchstart' in window)) return
    const el = contenedorRef.current
    if (!el) return

    function handleTouchStart(e) {
      const objetivo = e.target
      if (objetivo?.closest && objetivo.closest(SELECTOR_EXCLUIDO)) {
        gestoRef.current = null
        return
      }
      const t = e.touches[0]
      gestoRef.current = { x: t.clientX, y: t.clientY, ignorar: false }
    }

    function handleTouchMove(e) {
      const gesto = gestoRef.current
      if (!gesto) return
      const t = e.touches[0]
      const dx = t.clientX - gesto.x
      const dy = t.clientY - gesto.y
      // En cuanto el desplazamiento vertical supera al horizontal, se marca
      // para ignorar — nunca se llama preventDefault, así que el scroll
      // vertical normal de la página no se ve afectado en ningún momento.
      if (Math.abs(dy) > Math.abs(dx)) {
        gesto.ignorar = true
      }
    }

    function handleTouchEnd(e) {
      const gesto = gestoRef.current
      gestoRef.current = null
      if (!gesto || gesto.ignorar) return

      const t = e.changedTouches[0]
      const dx = t.clientX - gesto.x
      const dy = t.clientY - gesto.y

      if (Math.abs(dx) < UMBRAL_PX || Math.abs(dx) <= Math.abs(dy)) return

      const indiceActual = PESTANAS_SWIPE.indexOf(location.pathname)
      if (indiceActual === -1) return // no estamos en una de las 4 pestañas

      const siguiente = dx < 0 ? indiceActual + 1 : indiceActual - 1
      if (siguiente < 0 || siguiente >= PESTANAS_SWIPE.length) return // no hay pestaña más allá

      navigate(PESTANAS_SWIPE[siguiente])
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [location.pathname, navigate])

  return (
    <div className="app-layout" ref={contenedorRef}>
      <Outlet />
      <BottomNav />
    </div>
  )
}
