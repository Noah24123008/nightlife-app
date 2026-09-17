import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'
import FotoLocalMiniatura from './FotoLocalMiniatura'
import { getFechaNocturnaActual } from '../lib/dates'
import { iniciales } from '../lib/iniciales'

export default function LocalHoyCard({ local, posicion, destacado }) {
  const muestra = local.muestra_perfiles || []
  const totalAmigos = local.total_amigos ?? 0
  const esPodio = posicion === 2 || posicion === 3
  // /hoy es siempre "hoy nocturno": se pasa la misma fecha explícita en la
  // URL para que FichaLocal muestre exactamente el mismo contexto que
  // acabas de ver en el ranking, en vez de depender de su valor por
  // defecto (que podría, en teoría, evaluarse en un instante distinto).
  const fechaHoyISO = getFechaNocturnaActual()

  return (
    <li className={`local-item ${destacado ? 'local-item--destacado' : ''} ${esPodio ? 'local-item--podio' : ''}`}>
      <Link to={`/locales/${local.local_id}?fecha=${fechaHoyISO}`} className="local-hoy-enlace">
        <span className="rank-position">{posicion}</span>
        <FotoLocalMiniatura src={local.foto_url} alt={local.local_nombre} />
        <div className="local-info">
          {destacado && <span className="donde-va-v2-etiqueta">Más elegido</span>}
          <p className="venue-name">{local.local_nombre}</p>
          <p className="local-categoria">
            {local.total_personas} {local.total_personas === 1 ? 'va' : 'van'}
            {totalAmigos > 0 && (
              <span className="amigos-count-destacado">
                {' '}
                · {totalAmigos} {totalAmigos === 1 ? 'amigo' : 'amigos'}
              </span>
            )}
          </p>
          {muestra.length > 0 && (
            <div className="mini-avatares">
              {muestra.map((perfil) => (
                <span
                  key={perfil.id}
                  className="mini-avatar"
                  title={perfil.nombre || perfil.nombre_usuario || 'Usuario'}
                >
                  <ImagenConFallback
                    src={perfil.foto_url}
                    alt=""
                    placeholderClassName="mini-avatar--vacio"
                    textoAlternativo={iniciales(perfil)}
                  />
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="donde-va-v2-chevron" aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  )
}
