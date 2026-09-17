import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getOCrearPerfil, guardarPerfil, subirAvatar, validarImagenAvatar, getAmigos } from '../lib/api'
import ImagenConFallback from '../components/ImagenConFallback'
import InvitarAmigosCard from '../components/InvitarAmigosCard'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'
import { iniciales } from '../lib/iniciales'
import IconoCandado from '../components/IconoCandado'

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

  const [numAmigos, setNumAmigos] = useState(0)

  // Estado "dirty": comparación puramente en cliente contra los últimos
  // valores cargados/guardados. No toca guardarPerfil ni ninguna llamada a
  // Supabase — solo decide el aspecto del botón.
  const nombreOriginalRef = useRef('')
  const nombreUsuarioOriginalRef = useRef('')
  const huboCambios = nombre !== nombreOriginalRef.current || nombreUsuario !== nombreUsuarioOriginalRef.current

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
        nombreOriginalRef.current = data.nombre ?? ''
        nombreUsuarioOriginalRef.current = data.nombre_usuario ?? ''
      }

      const { data: amigosData } = await getAmigos(user.id)
      if (!activo) return
      setNumAmigos((amigosData ?? []).length)

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
    nombreOriginalRef.current = nombre
    nombreUsuarioOriginalRef.current = nombreUsuario
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
      <div className="app-screen perfil-v2">
        <p className="app-loading">Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="app-screen perfil-v2">
      <div className="perfil-v2-contenido">
        <h1 className="perfil-v2-titulo">Perfil</h1>

        <div className="perfil-v2-avatar-wrap">
          <ImagenConFallback
            src={fotoUrl}
            alt="Foto de perfil"
            className="perfil-foto perfil-v2-avatar"
            placeholderClassName="perfil-foto perfil-foto--vacia perfil-v2-avatar"
            textoAlternativo={iniciales({ nombre, nombre_usuario: nombreUsuario })}
          />
          <input
            ref={inputArchivoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleArchivo}
            className="perfil-input-archivo"
          />
          <button
            type="button"
            className="perfil-v2-avatar-camara"
            onClick={() => inputArchivoRef.current?.click()}
            disabled={subiendoFoto}
            aria-label={subiendoFoto ? 'Subiendo foto...' : 'Cambiar foto de perfil'}
          >
            📷
          </button>
        </div>

        <h2 className="perfil-v2-nombre">{nombre || 'Sin nombre'}</h2>
        {nombreUsuario && <p className="perfil-v2-usuario">@{nombreUsuario}</p>}

        <Link to={`/usuarios/${user.id}/amigos`} className="perfil-v2-amigos-link">
          <strong>{numAmigos}</strong> {numAmigos === 1 ? 'amigo' : 'amigos'}
        </Link>

        <div className="perfil-v2-accesos">
          <Link to={`/usuarios/${user.id}`} className="perfil-v2-acceso">
            <span className="perfil-v2-acceso-icono" aria-hidden="true">
              👁️
            </span>
            <span className="perfil-v2-acceso-texto">Ver mi perfil público</span>
            <span className="perfil-v2-chevron" aria-hidden="true">
              ›
            </span>
          </Link>

          <div className="perfil-v2-accesos-divisor" />

          <InvitarAmigosCard userId={user.id} />
        </div>

        {error && <p className="auth-error">{error}</p>}
        {mensajeExito && <p className="auth-info">{mensajeExito}</p>}

        <h2 className="perfil-v2-seccion-titulo">Información personal</h2>

        <form className="auth-form perfil-v2-form" onSubmit={handleGuardar}>
          <label className="perfil-v2-campo">
            <span className="perfil-v2-campo-textos">
              <span className="perfil-v2-campo-label">Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </span>
          </label>

          <label className="perfil-v2-campo">
            <span className="perfil-v2-campo-textos">
              <span className="perfil-v2-campo-label">Nombre de usuario</span>
              <input
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                placeholder="p. ej. laura_gijon"
              />
            </span>
          </label>

          <div className="perfil-v2-campos-divisor" />

          <label className="perfil-v2-campo perfil-v2-campo--bloqueado">
            <span className="perfil-v2-campo-textos">
              <span className="perfil-v2-campo-label">Email</span>
              <input value={user?.email ?? ''} disabled />
            </span>
            <span className="perfil-v2-campo-candado" aria-hidden="true">
              <IconoCandado />
            </span>
          </label>

          <label className="perfil-v2-campo perfil-v2-campo--bloqueado">
            <span className="perfil-v2-campo-textos">
              <span className="perfil-v2-campo-label">Ciudad</span>
              <input value="Gijón" disabled />
            </span>
            <span className="perfil-v2-campo-candado" aria-hidden="true">
              <IconoCandado />
            </span>
          </label>

          <button
            type="submit"
            className={`perfil-v2-guardar ${!huboCambios && !guardando ? 'perfil-v2-guardar--sin-cambios' : ''}`}
            disabled={guardando || !huboCambios}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>

        <button type="button" className="perfil-salir" onClick={signOut}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
