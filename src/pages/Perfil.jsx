import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getOCrearPerfil, guardarPerfil, subirAvatar, validarImagenAvatar, contarSeguidores, contarSeguidos } from '../lib/api'
import ImagenConFallback from '../components/ImagenConFallback'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function Perfil() {
  const { user, signOut } = useAuth()
  const inputArchivoRef = useRef(null)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  const [nombre, setNombre] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')

  const [numSeguidores, setNumSeguidores] = useState(0)
  const [numSeguidos, setNumSeguidos] = useState(0)

  useEffect(() => {
    if (!user) return
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const { data, error: errPerfil } = await getOCrearPerfil(user.id, user.email)
      if (!activo) return
      if (errPerfil) {
        setError(mensajeError(errPerfil, 'No se pudo cargar tu perfil.'))
        if (esErrorDeAutenticacion(errPerfil)) setTimeout(() => signOut(), 2000)
      } else if (data) {
        setNombre(data.nombre ?? '')
        setNombreUsuario(data.nombre_usuario ?? '')
        setFotoUrl(data.foto_url ?? '')
      }

      const [{ count: seguidoresData }, { count: seguidosData }] = await Promise.all([
        contarSeguidores(user.id),
        contarSeguidos(user.id),
      ])
      if (!activo) return
      setNumSeguidores(seguidoresData ?? 0)
      setNumSeguidos(seguidosData ?? 0)

      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [user])

  async function handleGuardar(e) {
    e.preventDefault()
    if (!user) return
    setGuardando(true)
    setError('')
    setMensajeExito('')

    const { error: errGuardar } = await guardarPerfil(user.id, {
      nombre: nombre.trim() || null,
      nombre_usuario: nombreUsuario.trim() || null,
    })

    setGuardando(false)

    if (errGuardar) {
      if (errGuardar.code === '23505') {
        setError('Ese nombre de usuario ya está en uso. Prueba con otro.')
      } else {
        setError(mensajeError(errGuardar, 'No se pudieron guardar los cambios. Inténtalo de nuevo.'))
        if (esErrorDeAutenticacion(errGuardar)) setTimeout(() => signOut(), 2000)
      }
      return
    }

    setMensajeExito('Cambios guardados ✓')
    setTimeout(() => setMensajeExito(''), 2500)
  }

  async function handleArchivo(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo || !user) return

    const errorValidacion = validarImagenAvatar(archivo)
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setSubiendoFoto(true)
    setError('')
    setMensajeExito('')

    const { url, error: errSubida } = await subirAvatar(user.id, archivo)
    if (errSubida) {
      setError(mensajeError(errSubida, 'No se pudo subir la imagen. Inténtalo de nuevo.'))
      setSubiendoFoto(false)
      if (esErrorDeAutenticacion(errSubida)) setTimeout(() => signOut(), 2000)
      return
    }

    const { error: errGuardar } = await guardarPerfil(user.id, { foto_url: url })
    setSubiendoFoto(false)

    if (errGuardar) {
      setError(mensajeError(errGuardar, 'La imagen se subió, pero no se pudo guardar en tu perfil.'))
      if (esErrorDeAutenticacion(errGuardar)) setTimeout(() => signOut(), 2000)
      return
    }

    setFotoUrl(url)
    setMensajeExito('Foto actualizada ✓')
    setTimeout(() => setMensajeExito(''), 2500)
  }

  if (cargando) {
    return (
      <div className="app-screen">
        <p className="app-loading">Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="app-screen">
      <header className="screen-header">
        <span className="screen-title">Perfil</span>
      </header>

      <Link to={`/usuarios/${user.id}`} className="perfil-ver-publico">
        Ver mi perfil público
      </Link>

      <div className="perfil-foto-preview">
        <ImagenConFallback
          src={fotoUrl}
          alt="Foto de perfil"
          className="perfil-foto"
          placeholderClassName="perfil-foto perfil-foto--vacia"
        />
      </div>

      <div className="seguimiento-contadores">
        <Link to={`/usuarios/${user.id}/seguidores`} className="seguimiento-contador">
          <span className="seguimiento-numero">{numSeguidores}</span>
          <span className="seguimiento-etiqueta">Seguidores</span>
        </Link>
        <Link to={`/usuarios/${user.id}/siguiendo`} className="seguimiento-contador">
          <span className="seguimiento-numero">{numSeguidos}</span>
          <span className="seguimiento-etiqueta">Siguiendo</span>
        </Link>
      </div>

      <div className="perfil-foto-acciones">
        <input
          ref={inputArchivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleArchivo}
          className="perfil-input-archivo"
        />
        <button
          type="button"
          className="perfil-cambiar-foto"
          onClick={() => inputArchivoRef.current?.click()}
          disabled={subiendoFoto}
        >
          {subiendoFoto ? 'Subiendo...' : 'Cambiar foto'}
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}
      {mensajeExito && <p className="auth-info">{mensajeExito}</p>}

      <form className="auth-form" onSubmit={handleGuardar}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
        </label>
        <label>
          Nombre de usuario
          <input
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            placeholder="p. ej. laura_gijon"
          />
        </label>
        <label>
          Email
          <input value={user?.email ?? ''} disabled />
        </label>

        <p className="perfil-nota">Ciudad: Gijón (por ahora es la única ciudad disponible)</p>

        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      <button type="button" className="perfil-salir" onClick={signOut}>
        Cerrar sesión
      </button>
    </div>
  )
}
