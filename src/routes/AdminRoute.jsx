import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Misma lógica que ProtectedRoute (sin sesión → /login, guardando la
// location de origen igual que allí) más una comprobación extra: si hay
// sesión pero el usuario no es admin, se le devuelve a Inicio en silencio
// — el panel no debe ni insinuar que existe a un usuario normal.
// La autorización real vive en el backend (RPCs con es_admin()); esto es
// solo para no mostrar la interfaz del panel a quien no debe verla.
export default function AdminRoute({ children }) {
  const { user, loading, esAdmin, cargandoRol } = useAuth()
  const location = useLocation()

  if (loading || cargandoRol) return <p className="app-loading">Cargando...</p>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!esAdmin) return <Navigate to="/" replace />

  return children
}
