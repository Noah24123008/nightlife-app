import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import BottomSheet from './BottomSheet'
import { enviarFeedback } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const TIPOS = [
  { valor: 'problema', etiqueta: 'He encontrado un problema' },
  { valor: 'idea', etiqueta: 'Tengo una idea' },
  { valor: 'no_se_entiende', etiqueta: 'Algo no se entiende' },
]

const LIMITE_MENSAJE = 1000

export default function FeedbackSheet({ abierto, onCerrar }) {
  const { user } = useAuth()
  const location = useLocation()
  const [tipo, setTipo] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const mensajeValido = mensaje.trim().length > 0
  const puedeEnviar = Boolean(tipo) && mensajeValido && !enviando

  function resetYCerrar() {
    if (enviando) return
    setTipo(null)
    setMensaje('')
    setEnviado(false)
    setError('')
    onCerrar()
  }

  async function handleEnviar() {
    if (!puedeEnviar || !user?.id) return
    setEnviando(true)
    setError('')

    const { error: errEnviar } = await enviarFeedback({
      usuarioId: user.id,
      tipo,
      mensaje: mensaje.trim(),
      rutaActual: location.pathname,
    })

    setEnviando(false)

    if (errEnviar) {
      setError('No se pudo enviar tu feedback. Inténtalo de nuevo.')
      return
    }

    setEnviado(true)
  }

  if (enviado) {
    return (
      <BottomSheet abierto={abierto} onCerrar={resetYCerrar} titulo="¡Gracias!" ariaLabel="Feedback enviado">
        <p className="instalar-sheet-intro">Hemos recibido tu feedback. Gracias por ayudarnos a mejorar NoctUp.</p>
        <button type="button" className="instalar-sheet-btn-entendido" onClick={resetYCerrar}>
          Cerrar
        </button>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet abierto={abierto} onCerrar={resetYCerrar} titulo="Enviar feedback" ariaLabel="Enviar feedback">
      <p className="instalar-sheet-intro">Cuéntanos qué podemos mejorar en NoctUp.</p>

      <div className="feedback-tipos">
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            className={`feedback-tipo-btn ${tipo === t.valor ? 'feedback-tipo-btn--activo' : ''}`}
            onClick={() => setTipo(t.valor)}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      <label className="feedback-textarea-label">
        Cuéntanos más
        <textarea
          className="feedback-textarea"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value.slice(0, LIMITE_MENSAJE))}
          rows={4}
          maxLength={LIMITE_MENSAJE}
        />
      </label>
      <p className="feedback-contador">
        {mensaje.length}/{LIMITE_MENSAJE}
      </p>

      {error && <p className="auth-error">{error}</p>}

      <button
        type="button"
        className="instalar-sheet-btn-principal"
        onClick={handleEnviar}
        disabled={!puedeEnviar}
        style={!puedeEnviar ? { background: '#d8d7d4', color: '#55596a', cursor: 'not-allowed' } : undefined}
      >
        {enviando ? 'Enviando...' : 'Enviar feedback'}
      </button>
    </BottomSheet>
  )
}
