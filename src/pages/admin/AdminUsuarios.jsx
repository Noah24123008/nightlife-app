import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminListarUsuarios } from '../../lib/api'
import ImagenConFallback from '../../components/ImagenConFallback'

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const { data, error: err } = await adminListarUsuarios()
      if (!activo) return
      if (err) {
        setError('No se pudieron cargar los usuarios.')
      } else {
        setUsuarios(data ?? [])
      }
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [])

  return (
    <div className="admin-v1-seccion">
      <div className="admin-v1-seccion-header">
        <h2 className="admin-v1-seccion-titulo">Usuarios</h2>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p className="inicio-vacio">Todavía no hay usuarios.</p>
      ) : (
        <div className="admin-v1-lista">
          {usuarios.map((usuario) => (
            <Link key={usuario.id} to={`/usuarios/${usuario.id}`} className="admin-v1-fila admin-v1-fila--enlace">
              <ImagenConFallback
                src={usuario.foto_url}
                alt=""
                className="admin-v1-fila-avatar"
                placeholderClassName="admin-v1-fila-avatar admin-v1-fila-foto--vacia"
              />
              <div className="admin-v1-fila-info">
                <p className="admin-v1-fila-nombre">{usuario.nombre || 'Sin nombre'}</p>
                <p className="admin-v1-fila-detalle">
                  {usuario.nombre_usuario ? `@${usuario.nombre_usuario}` : 'Sin usuario'}
                  {usuario.email ? ` · ${usuario.email}` : ''}
                </p>
              </div>
              {usuario.rol === 'admin' && <span className="admin-v1-estado admin-v1-estado--activo">Admin</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
