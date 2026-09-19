import { useMemo } from 'react'
import BottomSheet from './BottomSheet'

function detectarPlataforma() {
  if (typeof navigator === 'undefined') return 'otro'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'otro'
}

function SeccionAndroid() {
  return (
    <div className="instalar-sheet-seccion">
      <p className="instalar-sheet-seccion-titulo">Android</p>
      <ol className="instalar-sheet-pasos">
        <li>Abre NoctUp en Chrome</li>
        <li>Pulsa ⋮ en Chrome</li>
        <li>Pulsa "Instalar aplicación" o "Añadir a pantalla de inicio"</li>
      </ol>
    </div>
  )
}

function SeccionIOS() {
  return (
    <div className="instalar-sheet-seccion">
      <p className="instalar-sheet-seccion-titulo">iPhone</p>
      <ol className="instalar-sheet-pasos">
        <li>Abre NoctUp en Safari</li>
        <li>Pulsa el botón Compartir</li>
        <li>Pulsa "Añadir a pantalla de inicio"</li>
      </ol>
    </div>
  )
}

// puedeInstalarDirectamente / onInstalarAhora vienen de useInstalacionApp:
// si el navegador ha ofrecido beforeinstallprompt (Chrome/Android), se
// añade el botón "Instalar ahora" además de las instrucciones manuales.
export default function InstalarNoctUpSheet({ abierto, onCerrar, puedeInstalarDirectamente, onInstalarAhora }) {
  const plataforma = useMemo(detectarPlataforma, [])

  async function handleInstalarAhora() {
    const aceptado = await onInstalarAhora()
    if (aceptado) onCerrar()
  }

  return (
    <BottomSheet abierto={abierto} onCerrar={onCerrar} titulo="Instalar NoctUp" ariaLabel="Instalar NoctUp">
      <p className="instalar-sheet-intro">Añade NoctUp a tu pantalla de inicio para abrirla como una app.</p>

      {puedeInstalarDirectamente && (
        <button type="button" className="instalar-sheet-btn-principal" onClick={handleInstalarAhora}>
          Instalar ahora
        </button>
      )}

      {plataforma === 'ios' ? (
        <>
          <SeccionIOS />
          <SeccionAndroid />
        </>
      ) : (
        <>
          <SeccionAndroid />
          <SeccionIOS />
        </>
      )}

      <button type="button" className="instalar-sheet-btn-entendido" onClick={onCerrar}>
        Entendido
      </button>
    </BottomSheet>
  )
}
