import { useEffect, useState } from 'react'
import { getTodosLosLocalesAdmin, adminGuardarLocal, adminToggleLocalActivo, getCiudadPorNombre } from '../../lib/api'

const CATEGORIAS_SUGERIDAS = ['Discoteca', 'Bar', 'Pub', 'Terraza', 'Sala de conciertos', 'Coctelería']

export default function AdminLocales() {
  const [locales, setLocales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ciudadGijonId, setCiudadGijonId] = useState(null)

  const [editando, setEditando] = useState(null) // null | 'nuevo' | objeto local
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [procesandoId, setProcesandoId] = useState(null)

  async function cargarLocales() {
    setCargando(true)
    setError('')
    const { data, error: err } = await getTodosLosLocalesAdmin()
    if (err) {
      setError('No se pudieron cargar los locales.')
    } else {
      setLocales(data ?? [])
    }
    setCargando(false)
  }

  useEffect(() => {
    cargarLocales()
    getCiudadPorNombre('Gijón').then(({ data }) => setCiudadGijonId(data?.id ?? null))
  }, [])

  async function handleToggle(localId) {
    setProcesandoId(localId)
    const { error: err } = await adminToggleLocalActivo(localId)
    if (!err) await cargarLocales()
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
      p_ciudad_id: ciudadGijonId,
      p_nombre: formData.get('nombre')?.trim() || null,
      p_descripcion: formData.get('descripcion')?.trim() || null,
      p_direccion: formData.get('direccion')?.trim() || null,
      p_categoria: formData.get('categoria')?.trim() || null,
      p_foto_url: formData.get('foto_url')?.trim() || null,
      p_horario: formData.get('horario')?.trim() || null,
      p_activo: esNuevo ? true : editando.activo,
    }

    const { error: err } = await adminGuardarLocal(payload)
    setGuardando(false)

    if (err) {
      setErrorForm(err.message || 'No se pudo guardar el local.')
      return
    }

    setEditando(null)
    await cargarLocales()
  }

  return (
    <div className="admin-v1-seccion">
      <div className="admin-v1-seccion-header">
        <h2 className="admin-v1-seccion-titulo">Locales</h2>
        <button type="button" className="admin-v1-btn-nuevo" onClick={() => setEditando('nuevo')}>
          + Crear local
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {editando && (
        <form className="admin-v1-form auth-form" onSubmit={handleGuardar}>
          <h3 className="admin-v1-form-titulo">
            {editando === 'nuevo' ? 'Nuevo local' : `Editar: ${editando.nombre}`}
          </h3>
          <label>
            Nombre
            <input name="nombre" defaultValue={editando === 'nuevo' ? '' : editando.nombre} required />
          </label>
          <label>
            Categoría
            <input
              name="categoria"
              defaultValue={editando === 'nuevo' ? '' : editando.categoria ?? ''}
              list="admin-v1-categorias"
            />
          </label>
          <datalist id="admin-v1-categorias">
            {CATEGORIAS_SUGERIDAS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <label>
            Dirección
            <input name="direccion" defaultValue={editando === 'nuevo' ? '' : editando.direccion ?? ''} />
          </label>
          <label>
            Horario
            <input
              name="horario"
              placeholder="p. ej. 23:00 - 06:00"
              defaultValue={editando === 'nuevo' ? '' : editando.horario ?? ''}
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
        <p className="app-loading">Cargando locales...</p>
      ) : locales.length === 0 ? (
        <p className="inicio-vacio">Todavía no hay locales.</p>
      ) : (
        <div className="admin-v1-lista">
          {locales.map((local) => (
            <div key={local.id} className={`admin-v1-fila ${!local.activo ? 'admin-v1-fila--inactivo' : ''}`}>
              {local.foto_url ? (
                <img src={local.foto_url} alt="" className="admin-v1-fila-foto" />
              ) : (
                <div className="admin-v1-fila-foto admin-v1-fila-foto--vacia" aria-hidden="true" />
              )}
              <div className="admin-v1-fila-info">
                <p className="admin-v1-fila-nombre">{local.nombre}</p>
                <p className="admin-v1-fila-detalle">
                  {local.categoria || 'Sin categoría'} · {local.direccion || 'Sin dirección'}
                </p>
              </div>
              <span className={`admin-v1-estado ${local.activo ? 'admin-v1-estado--activo' : 'admin-v1-estado--inactivo'}`}>
                {local.activo ? 'Activo' : 'Inactivo'}
              </span>
              <div className="admin-v1-fila-acciones">
                <button type="button" onClick={() => setEditando(local)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleToggle(local.id)} disabled={procesandoId === local.id}>
                  {procesandoId === local.id ? '...' : local.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
