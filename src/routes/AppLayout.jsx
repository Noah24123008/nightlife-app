import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

// Swipe horizontal entre las 4 pestañas principales, mismo orden que
// BottomNav. location.pathname sigue siendo la única fuente de verdad para
// "qué pestaña está activa" — nada de esto se guarda de forma permanente;
// todo el estado de aquí (posición, deltaX, dragging...) es exclusivo del
// gesto en curso y se resetea al terminar.
const PESTANAS_SWIPE = ['/', '/locales', '/social', '/perfil']
const UMBRAL_NAVEGAR_PX = 70
const UMBRAL_INTENCION_PX = 10 // a partir de aquí se considera "arrastre", no tap
const UMBRAL_VELOCIDAD = 0.5 // px/ms — permite un "flick" corto y rápido
const MARGEN_BORDE_IOS = 24 // ignorar gestos que empiecen pegados al borde (gesto atrás/adelante de Safari)
const DURACION_TRANSICION_MS = 220

// Elementos donde un gesto horizontal ya tiene un significado propio y
// real: campos de formulario, contenido editable, el carrusel de días
// (scroll horizontal propio) y el mapa embebido en Locales (arrastre de
// Leaflet). A propósito NO se incluyen aquí "a" ni "button": ahora se
// distingue tap/swipe por el gesto, no excluyendo el elemento entero.
const SELECTOR_EXCLUIDO = 'input, textarea, select, [contenteditable="true"], .day-selector, .mapa-contenedor'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const contenedorRef = useRef(null)
  const paginaRef = useRef(null)
  const gestoRef = useRef(null)
  const huboArrastreRef = useRef(false)
  const [transicionando, setTransicionando] = useState(false)

  useEffect(() => {
    if (!('ontouchstart' in window)) return
    const contenedor = contenedorRef.current
    const pagina = paginaRef.current
    if (!contenedor || !pagina) return

    function indiceActual() {
      return PESTANAS_SWIPE.indexOf(location.pathname)
    }

    function aplicarTransform(px, conTransicion) {
      pagina.style.transition = conTransicion
        ? `transform ${DURACION_TRANSICION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
        : 'none'
      pagina.style.transform = `translate3d(${px}px, 0, 0)`
    }

    function handleTouchStart(e) {
      // Un gesto ya en curso (dos dedos, etc.) no se reinicia a medias.
      if (gestoRef.current) return

      const objetivo = e.target
      if (objetivo?.closest && objetivo.closest(SELECTOR_EXCLUIDO)) return

      // No estamos en una de las 4 pestañas (p. ej. FichaLocal, Buscar...):
      // no seguimos ningún gesto.
      if (indiceActual() === -1) return

      const t = e.touches[0]
      if (t.clientX < MARGEN_BORDE_IOS || t.clientX > window.innerWidth - MARGEN_BORDE_IOS) return

      gestoRef.current = { x: t.clientX, y: t.clientY, t: e.timeStamp, arrastrando: false, dx: 0 }
      huboArrastreRef.current = false
    }

    function handleTouchMove(e) {
      const gesto = gestoRef.current
      if (!gesto) return

      const t = e.touches[0]
      const dx = t.clientX - gesto.x
      const dy = t.clientY - gesto.y

      if (!gesto.arrastrando) {
        // Todavía no se ha decidido si esto es un tap o un swipe.
        if (Math.abs(dx) < UMBRAL_INTENCION_PX && Math.abs(dy) < UMBRAL_INTENCION_PX) return

        if (Math.abs(dy) > Math.abs(dx)) {
          // Dominancia vertical: es un scroll, no un swipe — se deja de
          // seguir este gesto sin tocar nada más.
          gestoRef.current = null
          return
        }

        // Confirmado: es un arrastre horizontal. A partir de aquí se
        // suprime el click posterior y se sigue el dedo visualmente.
        gesto.arrastrando = true
        huboArrastreRef.current = true
      }

      // Resistencia ligera en los extremos (Inicio hacia la derecha,
      // Perfil hacia la izquierda): se sigue el dedo pero muy amortiguado,
      // nunca se navega fuera de rango.
      const idx = indiceActual()
      const fueraDeRango = (idx === 0 && dx > 0) || (idx === PESTANAS_SWIPE.length - 1 && dx < 0)
      const dxVisual = fueraDeRango ? dx / 3.2 : dx

      gesto.dx = dxVisual
      gesto.t = e.timeStamp
      // preventDefault solo aquí, y solo tras confirmar que es un arrastre
      // horizontal real — el scroll vertical nunca se ve afectado.
      if (e.cancelable) e.preventDefault()
      aplicarTransform(dxVisual, false)
    }

    function completarSalida(direccion, siguienteRuta) {
      setTransicionando(true)
      aplicarTransform(direccion * window.innerWidth, true)
      window.setTimeout(() => {
        navigate(siguienteRuta)
        aplicarTransform(0, false)
        setTransicionando(false)
      }, DURACION_TRANSICION_MS)
    }

    function volverAlOrigen() {
      aplicarTransform(0, true)
    }

    function handleTouchEnd(e) {
      const gesto = gestoRef.current
      gestoRef.current = null
      if (!gesto || !gesto.arrastrando) return

      const duracion = Math.max(1, e.timeStamp - gesto.t + 1)
      const velocidad = Math.abs(gesto.dx) / duracion
      const idx = indiceActual()

      const cumpleUmbral = Math.abs(gesto.dx) >= UMBRAL_NAVEGAR_PX || velocidad >= UMBRAL_VELOCIDAD
      const direccion = gesto.dx < 0 ? 1 : -1 // izquierda = siguiente, derecha = anterior
      const siguienteIdx = idx + direccion
      const hayDestino = siguienteIdx >= 0 && siguienteIdx < PESTANAS_SWIPE.length

      if (cumpleUmbral && hayDestino) {
        completarSalida(direccion, PESTANAS_SWIPE[siguienteIdx])
      } else {
        volverAlOrigen()
      }
    }

    function handleClickCapture(e) {
      if (huboArrastreRef.current) {
        e.preventDefault()
        e.stopPropagation()
        huboArrastreRef.current = false
      }
    }

    contenedor.addEventListener('touchstart', handleTouchStart, { passive: true })
    contenedor.addEventListener('touchmove', handleTouchMove, { passive: false })
    contenedor.addEventListener('touchend', handleTouchEnd, { passive: true })
    contenedor.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    contenedor.addEventListener('click', handleClickCapture, true)

    return () => {
      contenedor.removeEventListener('touchstart', handleTouchStart)
      contenedor.removeEventListener('touchmove', handleTouchMove)
      contenedor.removeEventListener('touchend', handleTouchEnd)
      contenedor.removeEventListener('touchcancel', handleTouchEnd)
      contenedor.removeEventListener('click', handleClickCapture, true)
    }
  }, [location.pathname, navigate])

  return (
    <div className="app-layout" ref={contenedorRef}>
      <div className={`app-layout-pagina ${transicionando ? 'app-layout-pagina--transicionando' : ''}`} ref={paginaRef}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
