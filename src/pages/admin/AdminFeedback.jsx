import { useEffect, useState } from 'react'
import { adminListarFeedback, adminCambiarEstadoFeedback } from '../../lib/api'

const ETIQUETAS_TIPO = {
  problema: 'Problema',
  idea: 'Idea',
  no_se_entiende: 'No se entiende',
}

const ESTADOS = ['nuevo', 'revisado', 'resuelto']

export default function AdminFeedback() {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesandoId, setProcesandoId] = useState(null)

  async function cargar() {
    setCargando(true)
    setError('')
    const { data, error: err } = await adminListarFeedback()
    if (err) {
      setError('No se pudo cargar el feedback.')
    } else {
      setItems(data ?? [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function handleCambiarEstado(id, estado) {
    setProcesandoId(id)
    const { error: err } = await adminCambiarEstadoFeedback(id, estado)
    if (!err) await cargar()
    setProcesandoId(null)
  }

  return (
    <div className="admin-v1-seccion">
      <div className="admin-v1-seccion-header">
        <h2 className="admin-v1-seccion-titulo">Feedback</h2>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {cargando ? (
        <p className="app-loading">Cargando feedback...</p>
      ) : items.length === 0 ? (
        <p className="inicio-vacio">Todavía no hay feedback.</p>
      ) : (
        <div className="admin-v1-lista">
          {items.map((item) => (
            <div key={item.id} className="admin-v1-fila admin-v1-fila--feedback">
              <div className="admin-v1-fila-info">
                <p className="admin-v1-fila-nombre">
                  {ETIQUETAS_TIPO[item.tipo] || item.tipo} · {item.nombre || 'Sin nombre'}
                  {item.nombre_usuario ? ` (@${item.nombre_usuario})` : ''}
                </p>
                <p className="admin-v1-fila-mensaje">{item.mensaje}</p>
                <p className="admin-v1-fila-detalle">
                  {new Date(item.created_at).toLocaleString('es-ES')}
                  {item.ruta_actual ? ` · ${item.ruta_actual}` : ''}
                </p>
              </div>
              <span
                className={`admin-v1-estado ${item.estado === 'resuelto' ? 'admin-v1-estado--activo' : 'admin-v1-estado--inactivo'}`}
              >
                {item.estado}
              </span>
              <div className="admin-v1-fila-acciones">
                {ESTADOS.filter((e) => e !== item.estado).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handleCambiarEstado(item.id, e)}
                    disabled={procesandoId === item.id}
                  >
                    {procesandoId === item.id ? '...' : `→ ${e}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
