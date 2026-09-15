import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const location = useLocation()
  const from = location.state?.from

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    const { error } = await requestPasswordReset(email)
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setInfo('Si el email existe, te hemos enviado un enlace para restablecer la contraseña.')
  }

  return (
    <div className="auth-screen">
      <h1 className="auth-title">Recuperar contraseña</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>
      <p className="auth-switch">
        <Link to="/login" state={from ? { from } : undefined}>
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  )
}
