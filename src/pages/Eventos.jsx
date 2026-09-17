import { useEffect, useMemo, useState } from 'react'
import { getCiudadPorNombre, getEventosFuturos } from '../lib/api'
import { getFechaNocturnaActual, toISODate, addDays } from '../lib/dates'
import EventoCard from '../components/EventoCard'
import { SkeletonEventoCard } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import IconoCalendario from '../components/IconoCalendario'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'
import { useAuth } from '../context/AuthContext'

const CIUDAD_ACTUAL = 'Gijón'

// Viernes-domingo del fin de semana actual o más próximo, a partir de la
// fecha nocturna de hoy. Si hoy ya es sábado o domingo, es el fin de
// semana en curso (no el siguiente).
function calcularRangoFinDeSemana(hoyISO) {
  const hoy = new Date(`${hoyISO}T00:00:00`)
  const diaSemana = hoy.getDay() // 0 domingo ... 6 sábado
  let diasHastaViernes
  if (diaSemana === 5) diasHastaViernes = 0
  else if (diaSemana === 6) diasHastaViernes = -1
  else if (diaSemana === 0) diasHastaViernes = -2
  else diasHastaViernes = 5 - diaSemana

  const viernes = addDays(hoy, diasHastaViernes)
  const domingo = addDays(viernes, 2)
  return { desdeISO: toISODate(viernes), hastaISO: toISODate(domingo) }
}

export default function Eventos() {
  const { signOut } = useAuth()
  const hoyISO = useMemo(() => getFechaNocturnaActual(), [])
  const { desdeISO, hastaISO } = useMemo(() => calcularRangoFinDeSemana(hoyISO), [hoyISO])

  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')

      const { data: ciudad, error: errCiudad } = await getCiudadPorNombre(CIUDAD_ACTUAL)
      if (!activo) return
      if (errCiudad || !ciudad) {
        setError(mensajeError(errCiudad, 'No se pudieron cargar los eventos.'))
        setCargando(false)
        return
      }

      const { data, error: errEventos } = await getEventosFuturos(ciudad.id, hoyISO)
      if (!activo) return
      if (errEventos) {
        setError(mensajeError(errEventos, 'No se pudieron cargar los eventos.'))
        if (esErrorDeAutenticacion(errEventos)) setTimeout(() => signOut(), 2000)
      } else {
        setEventos(data ?? [])
      }
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [hoyISO, signOut])

  // Reparto sin duplicados: cada evento cae en exactamente una de las dos
  // secciones, según si su fecha está dentro del rango del fin de semana.
  const eventosFinde = useMemo(
    () => eventos.filter((e) => e.fecha >= desdeISO && e.fecha <= hastaISO),
    [eventos, desdeISO, hastaISO]
  )
  const eventosProximos = useMemo(
    () => eventos.filter((e) => e.fecha < desdeISO || e.fecha > hastaISO),
    [eventos, desdeISO, hastaISO]
  )

  const ESTILO_SECCION = { color: '#15151a' }

  return (
    <>
      {error && <p className="auth-error">{error}</p>}

      {/*
        Bloque reservado para "Eventos destacados" en el futuro (cuando
        existan los campos destacado/destacado_desde/destacado_hasta/
        prioridad_destacado): iría aquí, antes de "Este fin de semana",
        y solo se renderizaría si hay algún evento destacado real.
      */}

      {cargando ? (
        <>
          <h2 className="eventos-v2-seccion-titulo" style={ESTILO_SECCION}>Este fin de semana</h2>
          <div className="eventos-v2-lista">
            <SkeletonEventoCard />
            <SkeletonEventoCard />
          </div>
        </>
      ) : eventos.length === 0 ? (
        <EmptyState
          icono={<IconoCalendario size={22} />}
          titulo="No hay próximos eventos"
          texto="Cuando se publiquen nuevos eventos, aparecerán aquí."
        />
      ) : (
        <>
          {eventosFinde.length > 0 && (
            <>
              <h2 className="eventos-v2-seccion-titulo" style={ESTILO_SECCION}>Este fin de semana</h2>
              <div className="eventos-v2-lista">
                {eventosFinde.map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
              </div>
            </>
          )}

          {eventosProximos.length > 0 && (
            <>
              <h2 className="eventos-v2-seccion-titulo" style={ESTILO_SECCION}>Próximos eventos</h2>
              <div className="eventos-v2-lista">
                {eventosProximos.map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
