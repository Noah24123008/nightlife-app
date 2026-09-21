import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from './BottomSheet'
import { eliminarCuenta } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const PALABRA_CONFIRMACION = 'ELIMINAR'

export default function EliminarCuentaSheet({ abierto, onCerrar }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')

  const coincide = texto === PALABRA_CONFIRMACION

  function handleCerrar() {
    if (eliminando) return
    setTexto('')
    setError('')
    onCerrar()
  }

  async function handleEliminar() {
    if (!coincide || eliminando) return
    setEliminando(true)
    setError('')

    // Nunca se borra nada desde aquí directamente: la Edge Function
    // verifica la identidad a partir del JWT de la sesión y usa la
    // service role únicamente en el servidor.
    const { error: errEliminar } = await eliminarCuenta()

    if (errEliminar) {
      setEliminando(false)
      setError('No se pudo eliminar tu cuenta. Inténtalo de nuevo o contacta con nosotros.')
      return
    }

    await signOut()
    navigate('/cuenta-eliminada')
  }

  return (
    <BottomSheet abierto={abierto} onCerrar={handleCerrar} titulo="Eliminar mi cuenta" ariaLabel="Eliminar mi cuenta">
      <p className="instalar-sheet-intro">
        Esta acción eliminará tu cuenta y no se puede deshacer. Se borrarán tu perfil, tus votos, tus amistades y tus
        notificaciones.
      </p>

      <label className="auth-checkbox" style={{ display: 'block', marginBottom: 8 }}>
        Escribe <strong>{PALABRA_CONFIRMACION}</strong> para confirmar
      </label>
      <input
        type="text"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="eliminar-cuenta-input"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
      />

      {error && <p className="auth-error">{error}</p>}

      <button
        type="button"
        className="eliminar-cuenta-btn-confirmar"
        onClick={handleEliminar}
        disabled={!coincide || eliminando}
      >
        {eliminando ? 'Eliminando...' : 'Eliminar mi cuenta definitivamente'}
      </button>
      <button type="button" className="instalar-sheet-btn-entendido" onClick={handleCerrar} disabled={eliminando}>
        Cancelar
      </button>
    </BottomSheet>
  )
}
