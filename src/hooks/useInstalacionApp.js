import { useEffect, useState } from 'react'

function appYaInstalada() {
  if (typeof window === 'undefined') return false
  // display-mode: standalone cubre Android/Chrome (y Safari de escritorio);
  // navigator.standalone es el equivalente específico de iOS Safari, que
  // no implementa el media query anterior.
  const enStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const enIOSStandalone = window.navigator.standalone === true
  return Boolean(enStandalone || enIOSStandalone)
}

// Centraliza dos cosas para el botón de instalación de Inicio:
// 1) si la app ya está instalada (para ocultar el botón por completo);
// 2) si el navegador ha ofrecido beforeinstallprompt (Chrome/Android), para
//    poder disparar la instalación nativa desde un botón propio en vez de
//    depender del mini-infobar del navegador.
// El evento beforeinstallprompt se dispara como mucho una vez por carga de
// página, así que hay que capturarlo en cuanto aparece, no solo cuando se
// abre el sheet.
export function useInstalacionApp() {
  const [yaInstalada, setYaInstalada] = useState(appYaInstalada)
  const [eventoInstalacion, setEventoInstalacion] = useState(null)

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      setEventoInstalacion(e)
    }
    function handleAppInstalled() {
      setYaInstalada(true)
      setEventoInstalacion(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function instalarAhora() {
    if (!eventoInstalacion) return false
    eventoInstalacion.prompt()
    const resultado = await eventoInstalacion.userChoice
    setEventoInstalacion(null)
    return resultado.outcome === 'accepted'
  }

  return {
    yaInstalada,
    puedeInstalarDirectamente: Boolean(eventoInstalacion),
    instalarAhora,
  }
}
