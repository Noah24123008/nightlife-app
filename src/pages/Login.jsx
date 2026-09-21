import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { destinoSeguro } from '../lib/navegacionSegura'
import { mensajeErrorAuth } from '../lib/errors'
import CampoPassword from '../components/CampoPassword'
import gijonHero from '../assets/gijon-hero.png'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      setError(mensajeErrorAuth(error))
      return
    }

    navigate(destinoSeguro(from))
  }

  return (
    <div className="auth-screen login-v2">
      <div className="login-v2-hero" style={{ backgroundImage: `url(${gijonHero})` }}>
        <div className="login-v2-hero-overlay" aria-hidden="true" />
      </div>

      <div className="login-v2-contenido">
        <h1 className="auth-title">Iniciar sesión</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <CampoPassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/recuperar-password" state={from ? { from } : undefined}>
            ¿Has olvidado tu contraseña?
          </Link>
        </p>
        <p className="auth-switch">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" state={from ? { from } : undefined}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
