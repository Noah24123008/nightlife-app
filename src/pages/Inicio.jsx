import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getCiudadPorNombre,
  getLocalesPorCiudad,
  getVotosDelDia,
  getEventosDelDia,
  votarPorLocal,
  getNumeroNotificacionesNoLeidas,
  getRecomendacionesSocialesHoy,
  getDondeVaLaGenteHoy,
} from '../lib/api'
import { buildDiasVisibles, etiquetaDiaTexto } from '../lib/dates'
import DaySelector from '../components/DaySelector'
import VotoButton from '../components/VotoButton'
import RecomendacionSocialCard from '../components/RecomendacionSocialCard'
import FotoLocalMiniatura from '../components/FotoLocalMiniatura'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'
import gijonHero from '../assets/gijon-hero.png'

const CIUDAD_ACTUAL = 'Gijón'
const DIAS_VISIBLES = 8
const LIMITE_RANKING_INICIAL = 5
const LIMITE_RECOMENDACIONES_INICIAL = 3

export default function Inicio() {
  const { user, signOut } = useAuth()

  const dias = useMemo(() => buildDiasVisibles(new Date(), DIAS_VISIBLES), [])
  const [indiceDia, setIndiceDia] = useState(0)
  const diaSeleccionado = dias[indiceDia]

  const etiquetaTexto = useMemo(
    () => etiquetaDiaTexto(diaSeleccionado.fecha, indiceDia),
    [diaSeleccionado.fecha, indiceDia]
  )

  const [ciudadId, setCiudadId] = useState(null)
  const [locales, setLocales] = useState([])
  const [votosDia, setVotosDia] = useState([])
  const [eventosDia, setEventosDia] = useState([])
  // Número TOTAL de amigos por local (id → total_amigos), tal cual lo
  // devuelve get_donde_va_la_gente_hoy — no la longitud de
  // muestra_perfiles, que está limitada a 3 y solo sirve para avatares
  // en otra pantalla.
  const [totalAmigosPorLocal, setTotalAmigosPorLocal] = useState({})

  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoDia, setCargandoDia] = useState(true)
  const [votandoLocalId, setVotandoLocalId] = useState(null)
  const [error, setError] = useState('')

  const [recomendaciones, setRecomendaciones] = useState([])
  const [cargandoRecomendaciones, setCargandoRecomendaciones] = useState(true)

  const [numNoLeidas, setNumNoLeidas] = useState(0)

  const [mostrarRankingCompleto, setMostrarRankingCompleto] = useState(false)
  const [mostrarTodasRecomendaciones, setMostrarTodasRecomendaciones] = useState(false)

  // Cargar la ciudad y sus locales una sola vez
  useEffect(() => {
    let activo = true
    async function cargarBase() {
      setCargandoBase(true)
      const { data: ciudad, error: errCiudad } = await getCiudadPorNombre(CIUDAD_ACTUAL)
      if (!activo) return
      if (errCiudad || !ciudad) {
        setError(mensajeError(errCiudad, 'No se pudo cargar la ciudad de Gijón desde Supabase.'))
        setCargandoBase(false)
        if (esErrorDeAutenticacion(errCiudad)) setTimeout(() => signOut(), 2000)
        return
      }
      setCiudadId(ciudad.id)
      const { data: localesData, error: errLocales } = await getLocalesPorCiudad(ciudad.id)
      if (!activo) return
      if (errLocales) {
        setError(mensajeError(errLocales, 'No se pudieron cargar los locales.'))
        if (esErrorDeAutenticacion(errLocales)) setTimeout(() => signOut(), 2000)
      } else {
        setLocales(localesData ?? [])
      }
      setCargandoBase(false)
    }
    cargarBase()
    return () => {
      activo = false
    }
  }, [])

  // Votos y eventos del día seleccionado (siempre ambos, sea cual sea el día)
  useEffect(() => {
    if (!ciudadId) return
    let activo = true
    async function cargarDia() {
      setCargandoDia(true)
      setError('')
      const [
        { data: votosData, error: errVotos },
        { data: eventosData, error: errEventos },
        { data: rankingAmigosData },
      ] = await Promise.all([
        getVotosDelDia(diaSeleccionado.fechaISO),
        getEventosDelDia(ciudadId, diaSeleccionado.fechaISO),
        getDondeVaLaGenteHoy(diaSeleccionado.fechaISO),
      ])
      if (!activo) return

      if (errVotos) {
        setError(mensajeError(errVotos, 'No se pudo cargar el ranking de este día.'))
        if (esErrorDeAutenticacion(errVotos)) setTimeout(() => signOut(), 2000)
      } else {
        setVotosDia(votosData ?? [])
      }

      if (errEventos) {
        setError((prev) => prev || mensajeError(errEventos, 'No se pudieron cargar los eventos de este día.'))
        if (esErrorDeAutenticacion(errEventos)) setTimeout(() => signOut(), 2000)
      } else {
        setEventosDia(eventosData ?? [])
      }

      const totalAmigosPorId = {}
      for (const item of rankingAmigosData ?? []) {
        totalAmigosPorId[item.local_id] = item.total_amigos ?? 0
      }
      setTotalAmigosPorLocal(totalAmigosPorId)

      setCargandoDia(false)
    }
    cargarDia()
    return () => {
      activo = false
    }
  }, [ciudadId, diaSeleccionado.fechaISO])

  // Recomendaciones sociales del día seleccionado
  useEffect(() => {
    let activo = true
    async function cargarRecomendaciones() {
      setCargandoRecomendaciones(true)
      const { data } = await getRecomendacionesSocialesHoy(diaSeleccionado.fechaISO)
      if (!activo) return
      setRecomendaciones(data ?? [])
      setCargandoRecomendaciones(false)
    }
    cargarRecomendaciones()
    return () => {
      activo = false
    }
  }, [diaSeleccionado.fechaISO])

  // Contador de notificaciones no leídas para la campana de la cabecera
  useEffect(() => {
    let activo = true
    async function cargarContador() {
      const { count } = await getNumeroNotificacionesNoLeidas()
      if (!activo) return
      setNumNoLeidas(count ?? 0)
    }
    cargarContador()
    return () => {
      activo = false
    }
  }, [])

  // Al cambiar de día, no arrastrar los "ver más" expandidos del día anterior
  useEffect(() => {
    setMostrarRankingCompleto(false)
    setMostrarTodasRecomendaciones(false)
  }, [indiceDia])

  const miVotoLocalId = useMemo(
    () => votosDia.find((v) => v.usuario_id === user?.id)?.local_id ?? null,
    [votosDia, user]
  )

  const ranking = useMemo(() => {
    const conteos = new Map()
    for (const v of votosDia) {
      conteos.set(v.local_id, (conteos.get(v.local_id) ?? 0) + 1)
    }
    return locales
      .map((local) => ({ ...local, votos: conteos.get(local.id) ?? 0 }))
      .sort((a, b) => b.votos - a.votos)
  }, [locales, votosDia])

  const destinoTemporal = useMemo(
    () => locales.find((local) => local.nombre === 'Fiestas de Cimadevilla'),
    [locales]
  )

  async function handleVotar(localId) {
    if (!user) return
    setVotandoLocalId(localId)
    setError('')
    const { error: errVoto } = await votarPorLocal({
      usuarioId: user.id,
      localId,
      fecha: diaSeleccionado.fechaISO,
    })
    if (errVoto) {
      setError(mensajeError(errVoto, 'No se pudo registrar tu voto. Inténtalo de nuevo.'))
      if (esErrorDeAutenticacion(errVoto)) setTimeout(() => signOut(), 2000)
    } else {
      const { data } = await getVotosDelDia(diaSeleccionado.fechaISO)
      setVotosDia(data ?? [])
    }
    setVotandoLocalId(null)
  }

  // Selector de ciudad: por ahora es solo interfaz (Gijón sigue siendo la
  // única ciudad real y funcional; no filtra datos ni navega).
  const [ciudadMenuAbierto, setCiudadMenuAbierto] = useState(false)
  const ciudadMenuRef = useRef(null)

  useEffect(() => {
    if (!ciudadMenuAbierto) return
    function handleClickFuera(e) {
      if (ciudadMenuRef.current && !ciudadMenuRef.current.contains(e.target)) {
        setCiudadMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [ciudadMenuAbierto])

  return (
    <div className="app-screen inicio-v2">
      <div className="inicio-v2-hero" style={{ backgroundImage: `url(${gijonHero})` }}>
        <div className="inicio-v2-hero-overlay" aria-hidden="true" />

        <div className="inicio-v2-hero-contenido">
          <div className="inicio-v2-hero-header">
            <div className="inicio-v2-ciudad-selector" ref={ciudadMenuRef}>
              <h1 className="inicio-v2-ciudad-heading">
                <button
                  type="button"
                  className="inicio-v2-hero-ciudad-btn"
                  onClick={() => setCiudadMenuAbierto((abierto) => !abierto)}
                  aria-haspopup="true"
                  aria-expanded={ciudadMenuAbierto}
                >
                  <span className="inicio-v2-hero-ciudad">Gijón</span>
                  <span
                    className={`inicio-v2-ciudad-chevron ${ciudadMenuAbierto ? 'inicio-v2-ciudad-chevron--abierto' : ''}`}
                    aria-hidden="true"
                  >
                    ⌄
                  </span>
                </button>
              </h1>

              {ciudadMenuAbierto && (
                <div className="inicio-v2-ciudad-menu">
                  <button
                    type="button"
                    className="inicio-v2-ciudad-opcion inicio-v2-ciudad-opcion--activa"
                    onClick={() => setCiudadMenuAbierto(false)}
                  >
                    <span>Gijón</span>
                    <span className="inicio-v2-ciudad-check" aria-hidden="true">
                      ✓
                    </span>
                  </button>
                  <button
                    type="button"
                    className="inicio-v2-ciudad-opcion inicio-v2-ciudad-opcion--deshabilitada"
                    disabled
                  >
                    <span>Oviedo</span>
                    <span className="inicio-v2-ciudad-proximamente">Próximamente</span>
                  </button>
                </div>
              )}
            </div>
            <Link to="/notificaciones" className="glass-icon-btn" aria-label="Notificaciones">
              🔔
              {numNoLeidas > 0 && (
                <span className="badge-no-leidas">{numNoLeidas > 9 ? '9+' : numNoLeidas}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="inicio-v2-contenido">
        <DaySelector dias={dias} indiceSeleccionado={indiceDia} onSeleccionar={setIndiceDia} />

        {destinoTemporal && (
          <Link
            to={`/locales/${destinoTemporal.id}`}
            className="inicio-v2-destacado-card"
            style={destinoTemporal.foto_url ? { backgroundImage: `url(${destinoTemporal.foto_url})` } : undefined}
          >
            <div className="inicio-v2-destacado-overlay">
              <span className="badge-temporal">TEMPORAL</span>
              <p className="inicio-v2-destacado-titulo">✨ {destinoTemporal.nombre}</p>
              <p className="inicio-v2-destacado-subtitulo">Carpa especial este fin de semana</p>
              <span className="inicio-v2-destacado-enlace">Ver ficha →</span>
            </div>
          </Link>
        )}

        {indiceDia === 0 && (
          <Link to="/hoy" className="inicio-v2-banner-hoy">
            <span>🔥 Dónde va la gente hoy</span>
            <span className="inicio-v2-banner-hoy-flecha" aria-hidden="true">
              →
            </span>
          </Link>
        )}

        {error && <p className="auth-error">{error}</p>}

        {cargandoBase || cargandoDia ? (
          <p className="app-loading">Cargando...</p>
        ) : (
          <>
            <section className="inicio-v2-seccion">
              <div className="inicio-v2-ranking-header">
                <span className="inicio-v2-ranking-header-acento" aria-hidden="true" />
                <h2 className="inicio-v2-ranking-header-titulo">Dónde va la gente {etiquetaTexto}</h2>
              </div>
              {votosDia.length === 0 && (
                <p className="inicio-vacio">
                  Todavía no hay votos {etiquetaTexto}. ¡Sé el primero en decir a dónde vas!
                </p>
              )}
              <ul className="ranking">
                {(mostrarRankingCompleto ? ranking : ranking.slice(0, LIMITE_RANKING_INICIAL)).map((local, index) => (
                  <li
                    key={local.id}
                    className={`local-item ${index === 0 ? 'local-item--destacado' : ''} ${
                      miVotoLocalId === local.id ? 'local-item--votado' : ''
                    }`}
                  >
                    <span className="rank-position">{index + 1}</span>
                    <FotoLocalMiniatura src={local.foto_url} alt={local.nombre} />
                    <div className="local-info">
                      <p className="venue-name">{local.nombre}</p>
                      <p className="local-categoria">
                        {local.categoria} · {local.votos} {local.votos === 1 ? 'va' : 'van'}
                        {(totalAmigosPorLocal[local.id] ?? 0) > 0 &&
                          ` · ${totalAmigosPorLocal[local.id]} ${
                            totalAmigosPorLocal[local.id] === 1 ? 'amigo' : 'amigos'
                          }`}
                      </p>
                    </div>
                    <VotoButton
                      votado={miVotoLocalId === local.id}
                      cargando={votandoLocalId === local.id}
                      onClick={() => handleVotar(local.id)}
                    />
                  </li>
                ))}
              </ul>
              {!mostrarRankingCompleto && ranking.length > LIMITE_RANKING_INICIAL && (
                <button type="button" className="inicio-ver-mas" onClick={() => setMostrarRankingCompleto(true)}>
                  Ver todos los locales
                </button>
              )}
            </section>

            <section className="inicio-v2-seccion">
              <h2 className="inicio-v2-seccion-titulo">Eventos</h2>
              {eventosDia.length === 0 ? (
                <p className="inicio-vacio">No hay eventos programados para este día todavía.</p>
              ) : (
                <ul className="eventos-lista">
                  {eventosDia.map((evento) => (
                    <li key={evento.id}>
                      <Link to={`/eventos/${evento.id}`} className="evento-item">
                        <span className="evento-hora">{evento.hora_inicio?.slice(0, 5)}</span>
                        <div>
                          <p className="evento-nombre">{evento.nombre}</p>
                          <p className="evento-local">{evento.locales?.nombre}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <section className="inicio-v2-seccion recomendaciones-social">
          <h2 className="inicio-v2-seccion-titulo">Te puede interesar {etiquetaTexto}</h2>
          {cargandoRecomendaciones ? (
            <p className="app-loading">Cargando recomendaciones...</p>
          ) : recomendaciones.length === 0 ? (
            <p className="inicio-vacio">Hazte amigo de más gente para descubrir dónde van {etiquetaTexto}</p>
          ) : (
            <>
              <div className="recomendaciones-lista">
                {(mostrarTodasRecomendaciones
                  ? recomendaciones
                  : recomendaciones.slice(0, LIMITE_RECOMENDACIONES_INICIAL)
                ).map((r) => (
                  <RecomendacionSocialCard key={r.local_id} recomendacion={r} fecha={diaSeleccionado.fechaISO} />
                ))}
              </div>
              {!mostrarTodasRecomendaciones && recomendaciones.length > LIMITE_RECOMENDACIONES_INICIAL && (
                <button
                  type="button"
                  className="inicio-ver-mas"
                  onClick={() => setMostrarTodasRecomendaciones(true)}
                >
                  Ver más recomendaciones
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
