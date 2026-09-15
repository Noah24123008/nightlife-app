import { useState } from 'react'
import { compartirPerfil } from '../lib/compartir'

export default function InvitarAmigosCard({ userId }) {
  const [mensaje, setMensaje] = useState('')

  async function handleClick() {
    const resultado = await compartirPerfil(userId)
    if (resultado === 'copiado') {
      setMensaje('Enlace copiado ✓')
      setTimeout(() => setMensaje(''), 2500)
    } else if (resultado === 'error') {
      setMensaje('No se pudo copiar el enlace')
      setTimeout(() => setMensaje(''), 2500)
    }
  }

  return (
    <div className="invitar-amigos-wrap">
      <button type="button" className="invitar-amigos-card" onClick={handleClick}>
        <span className="invitar-amigos-icono" aria-hidden="true">
          👥
        </span>
        <span className="invitar-amigos-texto">Invitar amigos</span>
        <span className="invitar-amigos-chevron" aria-hidden="true">
          ›
        </span>
      </button>
      {mensaje && <p className="invitar-amigos-toast">{mensaje}</p>}
    </div>
  )
}
