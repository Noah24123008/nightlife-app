import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { destinoSeguro } from '../lib/navegacionSegura'
import { guardarAceptacionLegal } from '../lib/api'
import { VERSION_TERMINOS, VERSION_PRIVACIDAD } from '../lib/legal'
import { mensajeErrorAuth } from '../lib/errors'
import CampoPassword from '../components/CampoPassword'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [aceptaLegal, setAceptaLegal] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!aceptaLegal) {
      setError('Debes confirmar que tienes 18 años o más y aceptar los Términos de uso para continuar.')
      return
    }
    setError('')
    setLoading(true)
    const { data, error: errRegistro } = await signUp(nombre, email, password)

    if (errRegistro) {
      setLoading(false)
      setError(mensajeErrorAuth(errRegistro))
      return
    }

    if (data?.session) {
      // Sesión activa ya: confirmación de email desactivada o no requerida.
      // Hay usuario y sesión real, así que se puede registrar ya la
      // aceptación vía la RPC segura (si hiciera falta confirmación de
      // email, esto se guardará en su lugar al primer login, vía el
      // modal de aceptación pendiente — no hay sesión todavía con la que
      // llamar a la RPC).
      await guardarAceptacionLegal(VERSION_TERMINOS, VERSION_PRIVACIDAD)
      setLoading(false)
      // La decisión ya está tomada aquí; el setTimeout solo da tiempo a que
      // se lea el mensaje antes de navegar, no decide nada.
      setTimeout(() => navigate(destinoSeguro(from)), 1200)
      return
    }

    setLoading(false)

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
        <Link to="/login" state={from ? { from } : undefined} className="inicio-ver-mas">
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <h1 className="auth-title">Crear cuenta</h1>
      <p className="auth-aviso-edad">NoctUp es para mayores de 18 años.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
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
            autoComplete="new-password"
            minLength={6}
          />
        </label>
        <p className="auth-requisito">Mínimo 6 caracteres.</p>

        <label className="auth-checkbox">
          <input type="checkbox" checked={aceptaLegal} onChange={(e) => setAceptaLegal(e.target.checked)} />
          <span>
            Confirmo que tengo 18 años o más, acepto los <Link to="/terminos">Términos de uso</Link> y he leído la{' '}
            <Link to="/privacidad">Política de privacidad</Link>.
          </span>
        </label>

        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading || !aceptaLegal}>
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="auth-switch">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" state={from ? { from } : undefined}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
