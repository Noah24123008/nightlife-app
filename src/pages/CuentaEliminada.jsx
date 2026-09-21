import { Link } from 'react-router-dom'

export default function CuentaEliminada() {
  return (
    <div className="auth-screen">
      <h1 className="auth-title">Cuenta eliminada</h1>
      <p className="auth-info">
        Tu cuenta y tus datos asociados se han eliminado correctamente. Gracias por haber probado NoctUp.
      </p>
      <Link to="/login" className="inicio-ver-mas">
        Volver al inicio
      </Link>
    </div>
  )
}
