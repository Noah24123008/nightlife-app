import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getPerfilPublico,
  getVotosDelDia,
  getLocalPorId,
  getEventoPorId,
  getAmigos,
  consultarRelacionAmistad,
  enviarSolicitudAmistad,
  responderSolicitudAmistad,
  eliminarRelacionAmistad,
} from '../lib/api'
import { toISODate } from '../lib/dates'
import ImagenConFallback from '../components/ImagenConFallback'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function PerfilPublico() {
  const { id } = useParams()
  const { user, signOut } = useAuth()
  const hoyISO = useMemo(() => toISODate(new Date()), [])

  const [perfil, setPerfil] = useState(null)
  const [destino, setDestino] = useState(null)
  const [numAmigos, setNumAmigos] = useState(0)
  const [relacion, setRelacion] = useState(null)
  const [cargandoAccion, setCargandoAccion] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)

  const esMiPropioPerfil = user?.id === id

  async function refrescarAmistad() {
    const { data: amigosData } = await getAmigos(id)
    setNumAmigos((amigosData ?? []).length)
    if (user) {
      const { data: relacionData } = await consultarRelacionAmistad(user.id, id)
      setRelacion(relacionData ?? null)
    }
  }

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      setNoEncontrado(false)
      setDestino(null)

      const { data: perfilData, error: errPerfil } = await getPerfilPublico(id)
      if (!activo) return
      if (errPerfil) {
        setError(mensajeError(errPerfil, 'No se pudo cargar este perfil.'))
        setCargando(false)
        if (esErrorDeAutenticacion(errPerfil)) setTimeout(() => signOut(), 2000)
        return
      }
      if (!perfilData) {
        setNoEncontrado(true)
        setCargando(false)
        return
      }
      setPerfil(perfilData)

      const { data: amigosData } = await getAmigos(id)
      if (!activo) return
      setNumAmigos((amigosData ?? []).length)

      if (user && user.id !== id) {
        const { data: relacionData } = await consultarRelacionAmistad(user.id, id)
        if (!activo) return
        setRelacion(relacionData ?? null)
      }

      const { data: votosData, error: errVotos } = await getVotosDelDia(hoyISO)
      if (!activo) return
      const votoDeEsteUsuario = errVotos ? null : (votosData ?? []).find((v) => v.usuario_id === id) ?? null

      if (votoDeEsteUsuario?.evento_id) {
        const { data: eventoData } = await getEventoPorId(votoDeEsteUsuario.evento_id)
        if (!activo) return
        if (eventoData) {
          setDestino({
            enlace: `/eventos/${eventoData.id}`,
            texto: eventoData.locales?.nombre
              ? `${eventoData.nombre} (${eventoData.locales.nombre})`
              : eventoData.nombre,
          })
        }
      } else if (votoDeEsteUsuario?.local_id) {
        const { data: localData } = await getLocalPorId(votoDeEsteUsuario.local_id)
        if (!activo) return
        if (localData) {
          setDestino({ enlace: `/locales/${localData.id}`, texto: localData.nombre })
        }
      }

      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [id, hoyISO, user?.id])

  async function ejecutarAccionAmistad(accion, mensajeErrorFallback) {
    setCargandoAccion(true)
    setError('')
    const { error: err } = await accion()
    if (err) {
      setError(mensajeError(err, mensajeErrorFallback))
      if (esErrorDeAutenticacion(err)) setTimeout(() => signOut(), 2000)
    } else {
      await refrescarAmistad()
    }
    setCargandoAccion(false)
  }

  const handleAgregarAmigo = () =>
    ejecutarAccionAmistad(() => enviarSolicitudAmistad(id), 'No se pudo enviar la solicitud. Inténtalo de nuevo.')

  const handleCancelar = () =>
    ejecutarAccionAmistad(
      () => eliminarRelacionAmistad(relacion.id),
      'No se pudo cancelar la solicitud. Inténtalo de nuevo.'
    )

  const handleAceptar = () =>
    ejecutarAccionAmistad(
      () => responderSolicitudAmistad(relacion.id, true),
      'No se pudo aceptar la solicitud. Inténtalo de nuevo.'
    )

  const handleRechazar = () =>
    ejecutarAccionAmistad(
      () => responderSolicitudAmistad(relacion.id, false),
      'No se pudo rechazar la solicitud. Inténtalo de nuevo.'
    )

  const handleEliminarAmigo = () =>
    ejecutarAccionAmistad(
      () => eliminarRelacionAmistad(relacion.id),
      'No se pudo eliminar la amistad. Inténtalo de nuevo.'
    )

  if (cargando) {
    return (
      <div className="app-screen">
        <p className="app-loading">Cargando perfil...</p>
      </div>
    )
  }

  if (noEncontrado) {
    return (
      <div className="app-screen">
        <p className="inicio-vacio">Usuario no encontrado.</p>
      </div>
    )
  }

  return (
    <div className="app-screen">
      <header className="screen-header">
        <span className="screen-title">Perfil</span>
      </header>

      {error && <p className="auth-error">{error}</p>}

      <div className="perfil-foto-preview">
        <ImagenConFallback
          src={perfil.foto_url}
          alt={perfil.nombre || 'Foto de perfil'}
          className="perfil-foto"
          placeholderClassName="perfil-foto perfil-foto--vacia"
        />
      </div>

      <div className="perfil-publico-datos">
        <h1 className="venue-name">{perfil.nombre || 'Sin nombre'}</h1>
        {perfil.nombre_usuario && <p className="local-categoria">@{perfil.nombre_usuario}</p>}
        <p className="perfil-nota">Gijón</p>
      </div>

      <div className="seguimiento-contadores">
        <Link to={`/usuarios/${id}/amigos`} className="seguimiento-contador">
          <span className="seguimiento-numero">{numAmigos}</span>
          <span className="seguimiento-etiqueta">Amigos</span>
        </Link>
      </div>

      {!esMiPropioPerfil && user && (
        <div className="amistad-acciones">
          {!relacion || relacion.estado === 'rechazada' ? (
            <button type="button" className="seguir-btn" onClick={handleAgregarAmigo} disabled={cargandoAccion}>
              {cargandoAccion ? '...' : 'Añadir amigo'}
            </button>
          ) : relacion.estado === 'pendiente' && relacion.usuario_solicitante_id === user.id ? (
            <>
              <button type="button" className="seguir-btn seguir-btn--activo" disabled>
                Solicitud enviada
              </button>
              <button type="button" className="amistad-eliminar" onClick={handleCancelar} disabled={cargandoAccion}>
                {cargandoAccion ? '...' : 'Cancelar solicitud'}
              </button>
            </>
          ) : relacion.estado === 'pendiente' ? (
            <div className="amistad-respuesta">
              <button type="button" className="amistad-aceptar" onClick={handleAceptar} disabled={cargandoAccion}>
                Aceptar
              </button>
              <button type="button" className="amistad-rechazar" onClick={handleRechazar} disabled={cargandoAccion}>
                Rechazar
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="seguir-btn seguir-btn--activo" disabled>
                Amigos ✓
              </button>
              <button
                type="button"
                className="amistad-eliminar"
                onClick={handleEliminarAmigo}
                disabled={cargandoAccion}
              >
                {cargandoAccion ? '...' : 'Eliminar amigo'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="ficha-voto">
        {destino ? (
          <p className="ficha-votos-hoy">
            Hoy va a: <Link to={destino.enlace}>{destino.texto}</Link>
          </p>
        ) : (
          <p className="ficha-votos-hoy">Todavía no ha indicado dónde va hoy</p>
        )}
      </div>
    </div>
  )
}
