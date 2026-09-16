import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'
import FotoLocalMiniatura from './FotoLocalMiniatura'
import { toISODate } from '../lib/dates'
import { iniciales } from '../lib/iniciales'

export default function LocalHoyCard({ local, posicion, destacado }) {
  const muestra = local.muestra_perfiles || []
  const totalAmigos = local.total_amigos ?? 0
  // /hoy es siempre "hoy": se pasa la fecha explícita en la URL para que
  // FichaLocal use la misma arquitectura ?fecha= que el resto de la app,
  // en vez de depender de su valor por defecto.
  const fechaHoyISO = toISODate(new Date())

  return (
    <li className={`local-item ${destacado ? 'local-item--destacado' : ''}`}>
      <Link to={`/locales/${local.local_id}?fecha=${fechaHoyISO}`} className="local-hoy-enlace">
        <span className="rank-position">{posicion}</span>
        <FotoLocalMiniatura src={local.foto_url} alt={local.local_nombre} />
        <div className="local-info">
          <p className="venue-name">{local.local_nombre}</p>
          <p className="local-categoria">
            {local.total_personas} {local.total_personas === 1 ? 'va' : 'van'}
            {totalAmigos > 0 && ` · ${totalAmigos} ${totalAmigos === 1 ? 'amigo' : 'amigos'}`}
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
