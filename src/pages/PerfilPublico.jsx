import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getPerfilPublico,
  getVotosDelDia,
  getLocalPorId,
  getEventoPorId,
  compruebaSiSigo,
  seguirUsuario,
  dejarDeSeguirUsuario,
  contarSeguidores,
  contarSeguidos,
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
  const [numSeguidores, setNumSeguidores] = useState(0)
  const [numSeguidos, setNumSeguidos] = useState(0)
  const [siguiendo, setSiguiendo] = useState(false)
  const [cambiandoSeguir, setCambiandoSeguir] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [noEncontrado, setNoEncontrado] = useState(false)

  const esMiPropioPerfil = user?.id === id

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

      const [{ count: seguidoresData }, { count: seguidosData }] = await Promise.all([
        contarSeguidores(id),
        contarSeguidos(id),
      ])
      if (!activo) return
      setNumSeguidores(seguidoresData ?? 0)
      setNumSeguidos(seguidosData ?? 0)

      if (user && user.id !== id) {
        const { siguiendo: sigo } = await compruebaSiSigo(user.id, id)
        if (!activo) return
        setSiguiendo(sigo)
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

  async function handleSeguir() {
    if (!user || esMiPropioPerfil) return
    setCambiandoSeguir(true)
    setError('')

    if (siguiendo) {
      const { error: errDejar } = await dejarDeSeguirUsuario(user.id, id)
      if (errDejar) {
        setError(mensajeError(errDejar, 'No se pudo dejar de seguir. Inténtalo de nuevo.'))
        if (esErrorDeAutenticacion(errDejar)) setTimeout(() => signOut(), 2000)
      } else {
        setSiguiendo(false)
        setNumSeguidores((n) => Math.max(0, n - 1))
      }
    } else {
      const { error: errSeguir } = await seguirUsuario(user.id, id)
      if (errSeguir && errSeguir.code !== '23505') {
        setError(mensajeError(errSeguir, 'No se pudo seguir a este usuario. Inténtalo de nuevo.'))
        if (esErrorDeAutenticacion(errSeguir)) setTimeout(() => signOut(), 2000)
      } else {
        setSiguiendo(true)
        setNumSeguidores((n) => n + 1)
      }
    }
    setCambiandoSeguir(false)
  }

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
        <Link to={`/usuarios/${id}/seguidores`} className="seguimiento-contador">
          <span className="seguimiento-numero">{numSeguidores}</span>
          <span className="seguimiento-etiqueta">Seguidores</span>
        </Link>
        <Link to={`/usuarios/${id}/siguiendo`} className="seguimiento-contador">
          <span className="seguimiento-numero">{numSeguidos}</span>
          <span className="seguimiento-etiqueta">Siguiendo</span>
        </Link>
      </div>

      {!esMiPropioPerfil && user && (
        <button
          type="button"
          className={`seguir-btn ${siguiendo ? 'seguir-btn--activo' : ''}`}
          onClick={handleSeguir}
          disabled={cambiandoSeguir}
        >
          {cambiandoSeguir ? '...' : siguiendo ? 'Siguiendo ✓' : 'Seguir'}
        </button>
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
