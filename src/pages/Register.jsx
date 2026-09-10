import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: errRegistro } = await signUp(nombre, email, password)
    setLoading(false)

    if (errRegistro) {
      setError(errRegistro.message)
      return
    }

    if (data?.session) {
      // Sesión activa ya: confirmación de email desactivada o no requerida.
      // La decisión ya está tomada aquí; el setTimeout solo da tiempo a que
      // se lea el mensaje antes de navegar, no decide nada.
      setTimeout(() => navigate('/'), 1200)
      return
    }

    if (data?.user) {
      // Sin sesión pero con usuario: confirmación de email activada.
      setConfirmacionPendiente(true)
      return
    }

    setError('No se pudo completar el registro. Inténtalo de nuevo.')
  }

  if (confirmacionPendiente) {
    return (
      <div className="auth-screen">
        <h1 className="auth-title">Revisa tu email</h1>
        <p className="auth-info">
          Cuenta creada. Revisa tu email para confirmar tu cuenta antes de iniciar sesión.
        </p>
        <Link to="/login" className="inicio-ver-mas">
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <h1 className="auth-title">Crear cuenta</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="auth-switch">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  )
}
