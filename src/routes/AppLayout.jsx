import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Inicio from '../pages/Inicio'
import Locales from '../pages/Locales'
import Social from '../pages/Social'
import Perfil from '../pages/Perfil'

// Mismas 4 pestañas y mismo orden que BottomNav. Este mapa es una simple
// consulta de "qué componente corresponde a esta ruta" para poder montar
// temporalmente la pantalla vecina durante el gesto de swipe — NO es una
// segunda fuente de verdad de navegación: no decide rutas, no gestiona el
// historial. location.pathname sigue siendo la única autoridad sobre qué
// pestaña está activa; este mapa solo se consulta para saber qué dibujar al
// lado mientras se arrastra.
const PESTANAS_SWIPE = ['/', '/locales', '/social', '/perfil']
const COMPONENTE_POR_RUTA = {
  '/': Inicio,
  '/locales': Locales,
  '/social': Social,
  '/perfil': Perfil,
}

const UMBRAL_NAVEGAR_PX = 70
const UMBRAL_INTENCION_PX = 10
const UMBRAL_VELOCIDAD = 0.5
const MARGEN_BORDE_IOS = 24
const DURACION_TRANSICION_MS = 220

const SELECTOR_EXCLUIDO = 'input, textarea, select, [contenteditable="true"], .day-selector, .mapa-contenedor'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const contenedorRef = useRef(null)
  const swipeRef = useRef(null)
  const panelActualRef = useRef(null)
  const panelAdyacenteRef = useRef(null)
  const gestoRef = useRef(null)
  const huboArrastreRef = useRef(false)

  // Único estado de React del gesto: qué pantalla vecina mostrar (o
  // ninguna). Se actualiza como mucho una vez por gesto, al confirmarse la
  // dirección — nunca por cada píxel arrastrado; el seguimiento del dedo se
  // hace con manipulación directa del DOM vía refs.
  const [adyacente, setAdyacente] = useState(null)

  useEffect(() => {
    if (!('ontouchstart' in window)) return
    const contenedor = contenedorRef.current
    if (!contenedor) return

    function indiceActual() {
      return PESTANAS_SWIPE.indexOf(location.pathname)
    }

    function activarModoSwipe(alturaPx) {
      const swipeEl = swipeRef.current
      if (!swipeEl) return
      swipeEl.style.position = 'relative'
      swipeEl.style.overflow = 'hidden'
      swipeEl.style.height = `${alturaPx}px`
    }

    function desactivarModoSwipe() {
      const swipeEl = swipeRef.current
      if (!swipeEl) return
      swipeEl.style.position = ''
      swipeEl.style.overflow = ''
      swipeEl.style.height = ''
    }

    function posicionarPaneles(activo) {
      for (const el of [panelActualRef.current, panelAdyacenteRef.current]) {
        if (!el) continue
        if (activo) {
          el.style.position = 'absolute'
          el.style.top = '0'
          el.style.left = '0'
          el.style.width = '100%'
          el.style.willChange = 'transform'
        } else {
          el.style.position = ''
          el.style.top = ''
          el.style.left = ''
          el.style.width = ''
          el.style.willChange = ''
          el.style.transform = ''
          el.style.transition = ''
        }
      }
    }

    function aplicarTransform(el, px, conTransicion) {
      if (!el) return
      el.style.transition = conTransicion
        ? `transform ${DURACION_TRANSICION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
        : 'none'
      el.style.transform = `translate3d(${px}px, 0, 0)`
    }

    function handleTouchStart(e) {
      if (gestoRef.current) return
      const objetivo = e.target
      if (objetivo?.closest && objetivo.closest(SELECTOR_EXCLUIDO)) return
      if (indiceActual() === -1) return

      const t = e.touches[0]
      if (t.clientX < MARGEN_BORDE_IOS || t.clientX > window.innerWidth - MARGEN_BORDE_IOS) return

      gestoRef.current = {
        x: t.clientX,
        y: t.clientY,
        t: e.timeStamp,
        arrastrando: false,
        dx: 0,
        ancho: contenedor.clientWidth,
        alto: panelActualRef.current?.offsetHeight || contenedor.clientHeight,
      }
      huboArrastreRef.current = false
    }

    function handleTouchMove(e) {
      const gesto = gestoRef.current
      if (!gesto) return

      const t = e.touches[0]
      const dx = t.clientX - gesto.x
      const dy = t.clientY - gesto.y

      if (!gesto.arrastrando) {
        if (Math.abs(dx) < UMBRAL_INTENCION_PX && Math.abs(dy) < UMBRAL_INTENCION_PX) return
        if (Math.abs(dy) > Math.abs(dx)) {
          gestoRef.current = null
          return
        }

        const idx = indiceActual()
        const direccion = dx < 0 ? 1 : -1
        const idxAdyacente = idx + direccion
        const hayVecino = idxAdyacente >= 0 && idxAdyacente < PESTANAS_SWIPE.length

        gesto.arrastrando = true
        huboArrastreRef.current = true
        gesto.direccion = direccion
        gesto.hayVecino = hayVecino

        activarModoSwipe(gesto.alto)
        posicionarPaneles(true)

        if (hayVecino) {
          gesto.rutaAdyacente = PESTANAS_SWIPE[idxAdyacente]
          aplicarTransform(panelAdyacenteRef.current, direccion * gesto.ancho, false)
          setAdyacente({ ruta: gesto.rutaAdyacente })
        }
      }

      const idx = indiceActual()
      const fueraDeRango = (idx === 0 && dx > 0) || (idx === PESTANAS_SWIPE.length - 1 && dx < 0)
      const dxVisual = fueraDeRango ? dx / 3.2 : dx

      gesto.dx = dxVisual
      gesto.t = e.timeStamp
      if (e.cancelable) e.preventDefault()

      aplicarTransform(panelActualRef.current, dxVisual, false)
      if (gesto.hayVecino) {
        aplicarTransform(panelAdyacenteRef.current, gesto.direccion * gesto.ancho + dxVisual, false)
      }
    }

    function limpiarTrasTransicion() {
      desactivarModoSwipe()
      posicionarPaneles(false)
      setAdyacente(null)
    }

    function completarSalida(gesto) {
      aplicarTransform(panelActualRef.current, gesto.direccion * gesto.ancho, true)
      if (gesto.hayVecino) aplicarTransform(panelAdyacenteRef.current, 0, true)
      window.setTimeout(() => {
        navigate(gesto.rutaAdyacente)
        limpiarTrasTransicion()
      }, DURACION_TRANSICION_MS)
    }

    function volverAlOrigen(gesto) {
      aplicarTransform(panelActualRef.current, 0, true)
      if (gesto.hayVecino) aplicarTransform(panelAdyacenteRef.current, gesto.direccion * gesto.ancho, true)
      window.setTimeout(limpiarTrasTransicion, DURACION_TRANSICION_MS)
    }

    function handleTouchEnd(e) {
      const gesto = gestoRef.current
      gestoRef.current = null
      if (!gesto || !gesto.arrastrando) return

      const duracion = Math.max(1, e.timeStamp - gesto.t + 1)
      const velocidad = Math.abs(gesto.dx) / duracion
      const cumpleUmbral = Math.abs(gesto.dx) >= UMBRAL_NAVEGAR_PX || velocidad >= UMBRAL_VELOCIDAD

      if (cumpleUmbral && gesto.hayVecino) {
        completarSalida(gesto)
      } else {
        volverAlOrigen(gesto)
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

  const ComponenteAdyacente = adyacente ? COMPONENTE_POR_RUTA[adyacente.ruta] : null

  return (
    <div className="app-layout" ref={contenedorRef}>
      <div className="app-layout-swipe" ref={swipeRef}>
        <div className="app-layout-panel" ref={panelActualRef}>
          <Outlet />
        </div>
        {ComponenteAdyacente && (
          <div className="app-layout-panel" ref={panelAdyacenteRef}>
            <ComponenteAdyacente />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
