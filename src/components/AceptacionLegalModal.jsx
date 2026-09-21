import { useState } from 'react'
import { Link } from 'react-router-dom'
import BottomSheet from './BottomSheet'
import { guardarAceptacionLegal } from '../lib/api'
import { VERSION_TERMINOS, VERSION_PRIVACIDAD } from '../lib/legal'
import { useAuth } from '../context/AuthContext'

// No se puede descartar sin confirmar: onCerrar es un no-op a propósito,
// así que ni el click fuera ni Escape (ambos ya gestionados dentro de
// BottomSheet) cierran nada — la única salida es marcar la casilla y
// pulsar "Continuar".
export default function AceptacionLegalModal({ onAceptado }) {
  const { user } = useAuth()
  const [marcado, setMarcado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmar() {
    if (!marcado || !user?.id) return
    setGuardando(true)
    setError('')
    const { error: errGuardar } = await guardarAceptacionLegal(VERSION_TERMINOS, VERSION_PRIVACIDAD)
    setGuardando(false)
    if (errGuardar) {
      setError('No se pudo guardar tu confirmación. Inténtalo de nuevo.')
      return
    }
    onAceptado()
  }

  return (
    <BottomSheet
      abierto
      onCerrar={() => {}}
      titulo="Antes de continuar"
      ariaLabel="Confirmar términos y privacidad"
      noDescartable
    >
      <p className="instalar-sheet-intro">
        Hemos actualizado nuestros términos y política de privacidad. Confírmalo para seguir usando NoctUp.
      </p>

      <label className="auth-checkbox">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(e) => setMarcado(e.target.checked)}
          autoComplete="off"
        />
        <span>
          Confirmo que tengo 18 años o más, acepto los <Link to="/terminos">Términos de uso</Link> y he leído la{' '}
          <Link to="/privacidad">Política de privacidad</Link>.
        </span>
      </label>

      {error && <p className="auth-error">{error}</p>}

      <button
        type="button"
        className="instalar-sheet-btn-principal"
        onClick={handleConfirmar}
        disabled={!marcado || guardando}
        style={
          !marcado || guardando
            ? { background: '#d8d7d4', color: '#8a8f9c', cursor: 'not-allowed' }
            : undefined
        }
      >
        {guardando ? 'Guardando...' : 'Continuar'}
      </button>
    </BottomSheet>
  )
}
