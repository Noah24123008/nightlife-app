import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getCiudadPorNombre,
  getLocalesPorCiudad,
  getVotosDelDia,
  getEventosDelDia,
  votarPorLocal,
  eliminarVoto,
  getNumeroNotificacionesNoLeidas,
  getRecomendacionesSocialesHoy,
  getDondeVaLaGenteHoy,
} from '../lib/api'
import { buildDiasVisibles, etiquetaDiaTexto, toISODate, addDays, MAX_DIAS_FUTURO } from '../lib/dates'
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

// Mismo patrón de validación que ya usa FichaLocal para su ?fecha=, con el
// añadido del límite superior (no se puede seleccionar más allá del rango
// permitido por el calendario).
function fechaEnRangoValido(valor, hoyISO, maxISO) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return false
  return valor >= hoyISO && valor <= maxISO
}

export default function Inicio() {
  const { user, signOut } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const hoy = useMemo(() => new Date(), [])
  const hoyISO = useMemo(() => toISODate(hoy), [hoy])
  const fechaMaxISO = useMemo(() => toISODate(addDays(hoy, MAX_DIAS_FUTURO)), [hoy])

  // Fecha seleccionada: viene de ?fecha= si es válida y está dentro del
  // rango permitido (igual que ya hace FichaLocal con su propia ?fecha=);
  // si no, hoy. Es la fuente de verdad — el índice dentro de la ventana
  // visible se deriva de ella, no al revés, para que "conservar la fecha
  // al volver atrás" funcione con solo mantenerla en la URL.
  const fechaParam = searchParams.get('fecha')
  const [fechaSeleccionadaISO, setFechaSeleccionadaISO] = useState(() =>
    fechaEnRangoValido(fechaParam, hoyISO, fechaMaxISO) ? fechaParam : hoyISO
  )

  const dias = useMemo(
    () => buildDiasVisibles(hoy, DIAS_VISIBLES, new Date(`${fechaSeleccionadaISO}T00:00:00`)),
    [hoy, fechaSeleccionadaISO]
  )
  const indiceDia = useMemo(() => {
    const idx = dias.findIndex((d) => d.fechaISO === fechaSeleccionadaISO)
    return idx === -1 ? 0 : idx
  }, [dias, fechaSeleccionadaISO])
  const diaSeleccionado = dias[indiceDia]

  function handleCambiarFecha(fechaISO) {
    if (!fechaEnRangoValido(fechaISO, hoyISO, fechaMaxISO)) return
    setFechaSeleccionadaISO(fechaISO)
    setSearchParams(
      (prev) => {
        const siguiente = new URLSearchParams(prev)
        siguiente.set('fecha', fechaISO)
        return siguiente
      },
      { replace: true }
    )
  }

  function handleSeleccionarIndice(index) {
    const fechaISO = dias[index]?.fechaISO
    if (fechaISO) handleCambiarFecha(fechaISO)
  }

  const etiquetaTexto = useMemo(() => etiquetaDiaTexto(diaSeleccionado.fecha), [diaSeleccionado.fecha])

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
  }, [fechaSeleccionadaISO])

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

    const fecha = diaSeleccionado.fechaISO
    const yaVotadoAqui = miVotoLocalId === localId

    // Optimista: votosDia es la misma fuente de la que ya derivan
    // miVotoLocalId y el ranking (useMemo), así que mutarla aquí basta —
    // no se duplica ninguna lógica, todo lo demás se recalcula solo.
    // Si ya había un voto (en este local u otro), se quita antes de poner
    // el nuevo: así cambiar de local dentro del mismo día se ve como
    // "sueltas uno, coges el otro", nunca como dos votos a la vez.
    const votosPrevios = votosDia
    const otrosVotos = votosDia.filter((v) => v.usuario_id !== user.id)
    const votosOptimistas = yaVotadoAqui
      ? otrosVotos
      : [...otrosVotos, { usuario_id: user.id, local_id: localId, fecha, evento_id: null }]

    setVotosDia(votosOptimistas)
    setVotandoLocalId(localId)
    setError('')

    const { error: errVoto } = yaVotadoAqui
      ? await eliminarVoto({ usuarioId: user.id, fecha })
      : await votarPorLocal({ usuarioId: user.id, localId, fecha })

    if (errVoto) {
      // Revertir: el botón y los contadores vuelven exactamente a como
      // estaban antes del clic.
      setVotosDia(votosPrevios)
      const mensajePorDefecto = yaVotadoAqui
        ? 'No se pudo quitar tu voto. Inténtalo de nuevo.'
        : 'No se pudo registrar tu voto. Inténtalo de nuevo.'
      setError(mensajeError(errVoto, mensajePorDefecto))
      if (esErrorDeAutenticacion(errVoto)) setTimeout(() => signOut(), 2000)
    } else {
      // El conteo de amigos depende de son_amigos() en el servidor (no se
      // puede calcular en el cliente) — se refresca en segundo plano, sin
      // bloquear el botón, que ya muestra el estado correcto al instante.
      getDondeVaLaGenteHoy(fecha).then(({ data: rankingAmigosData }) => {
        const totalAmigosPorId = {}
        for (const item of rankingAmigosData ?? []) {
          totalAmigosPorId[item.local_id] = item.total_amigos ?? 0
        }
        setTotalAmigosPorLocal(totalAmigosPorId)
      })
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
        <DaySelector
          dias={dias}
          indiceSeleccionado={indiceDia}
          onSeleccionar={handleSeleccionarIndice}
          onSeleccionarFecha={handleCambiarFecha}
          fechaMinISO={hoyISO}
          fechaMaxISO={fechaMaxISO}
        />

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

        {diaSeleccionado.fechaISO === hoyISO && (
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
                    <Link
                      to={`/locales/${local.id}?fecha=${diaSeleccionado.fechaISO}`}
                      className="local-item-enlace"
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
                    </Link>
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
