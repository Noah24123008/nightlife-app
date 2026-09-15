import { useEffect, useState } from 'react'
import { getTodosLosEventosAdmin, getTodosLosLocalesAdmin, adminGuardarEvento, adminToggleEventoActivo } from '../../lib/api'
import { formatearFechaLarga } from '../../lib/dates'

export default function AdminEventos() {
  const [eventos, setEventos] = useState([])
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [editando, setEditando] = useState(null) // null | 'nuevo' | objeto evento
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [procesandoId, setProcesandoId] = useState(null)

  async function cargarEventos() {
    setCargando(true)
    setError('')
    const { data, error: err } = await getTodosLosEventosAdmin()
    if (err) {
      setError('No se pudieron cargar los eventos.')
    } else {
      setEventos(data ?? [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarEventos()
    getTodosLosLocalesAdmin().then(({ data }) => setLocales(data ?? []))
  }, [])

  async function handleToggle(eventoId) {
    setProcesandoId(eventoId)
    const { error: err } = await adminToggleEventoActivo(eventoId)
    if (!err) await cargarEventos()
    setProcesandoId(null)
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setGuardando(true)
    setErrorForm('')

    const formData = new FormData(e.target)
    const esNuevo = editando === 'nuevo'
    const payload = {
      p_id: esNuevo ? null : editando.id,
      p_local_id: formData.get('local_id') || null,
      p_nombre: formData.get('nombre')?.trim() || null,
      p_descripcion: formData.get('descripcion')?.trim() || null,
      p_fecha: formData.get('fecha') || null,
      p_hora_inicio: formData.get('hora_inicio') || null,
      p_hora_fin: formData.get('hora_fin') || null,
      p_foto_url: formData.get('foto_url')?.trim() || null,
      p_activo: esNuevo ? true : editando.activo,
    }

    const { error: err } = await adminGuardarEvento(payload)
    setGuardando(false)

    if (err) {
      setErrorForm(err.message || 'No se pudo guardar el evento.')
      return
    }

    setEditando(null)
    await cargarEventos()
  }

  return (
    <div className="admin-v1-seccion">
      <div className="admin-v1-seccion-header">
        <h2 className="admin-v1-seccion-titulo">Eventos</h2>
        <button type="button" className="admin-v1-btn-nuevo" onClick={() => setEditando('nuevo')} disabled={locales.length === 0}>
          + Crear evento
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}
      {locales.length === 0 && !cargando && (
        <p className="inicio-vacio">Crea antes al menos un local para poder asociarle eventos.</p>
      )}

      {editando && (
        <form className="admin-v1-form auth-form" onSubmit={handleGuardar}>
          <h3 className="admin-v1-form-titulo">{editando === 'nuevo' ? 'Nuevo evento' : `Editar: ${editando.nombre}`}</h3>
          <label>
            Local
            <select name="local_id" defaultValue={editando === 'nuevo' ? '' : editando.local_id} required>
              <option value="" disabled>
                Selecciona un local
              </option>
              {locales.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nombre
            <input name="nombre" defaultValue={editando === 'nuevo' ? '' : editando.nombre} required />
          </label>
          <label>
            Fecha
            <input
              name="fecha"
              type="date"
              defaultValue={editando === 'nuevo' ? '' : editando.fecha}
              required
            />
          </label>
          <label>
            Hora de inicio
            <input
              name="hora_inicio"
              type="time"
              defaultValue={editando === 'nuevo' ? '' : editando.hora_inicio?.slice(0, 5) ?? ''}
            />
          </label>
          <label>
            Hora de fin
            <input
              name="hora_fin"
              type="time"
              defaultValue={editando === 'nuevo' ? '' : editando.hora_fin?.slice(0, 5) ?? ''}
            />
          </label>
          <label>
            URL de la foto
            <input
              name="foto_url"
              type="url"
              placeholder="https://..."
              defaultValue={editando === 'nuevo' ? '' : editando.foto_url ?? ''}
            />
          </label>
          <label>
            Descripción
            <textarea name="descripcion" rows={3} defaultValue={editando === 'nuevo' ? '' : editando.descripcion ?? ''} />
          </label>
          {errorForm && <p className="auth-error">{errorForm}</p>}
          <div className="admin-v1-form-acciones">
            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              className="admin-v1-btn-cancelar"
              onClick={() => setEditando(null)}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="app-loading">Cargando eventos...</p>
      ) : eventos.length === 0 ? (
        <p className="inicio-vacio">Todavía no hay eventos.</p>
      ) : (
        <div className="admin-v1-lista">
          {eventos.map((evento) => (
            <div key={evento.id} className={`admin-v1-fila ${!evento.activo ? 'admin-v1-fila--inactivo' : ''}`}>
              {evento.foto_url ? (
                <img src={evento.foto_url} alt="" className="admin-v1-fila-foto" />
              ) : (
                <div className="admin-v1-fila-foto admin-v1-fila-foto--vacia" aria-hidden="true" />
              )}
              <div className="admin-v1-fila-info">
                <p className="admin-v1-fila-nombre">{evento.nombre}</p>
                <p className="admin-v1-fila-detalle">
                  {evento.locales?.nombre ?? 'Local eliminado'} · {formatearFechaLarga(evento.fecha)}
                </p>
              </div>
              <span className={`admin-v1-estado ${evento.activo ? 'admin-v1-estado--activo' : 'admin-v1-estado--inactivo'}`}>
                {evento.activo ? 'Activo' : 'Inactivo'}
              </span>
              <div className="admin-v1-fila-acciones">
                <button type="button" onClick={() => setEditando(evento)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleToggle(evento.id)} disabled={procesandoId === evento.id}>
                  {procesandoId === evento.id ? '...' : evento.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
