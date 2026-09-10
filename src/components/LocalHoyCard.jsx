import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'

export default function LocalHoyCard({ local, posicion, destacado }) {
  const muestra = local.muestra_perfiles || []
  const extra = local.total_personas - muestra.length

  return (
    <li className={`local-item ${destacado ? 'local-item--destacado' : ''}`}>
      <Link to={`/locales/${local.local_id}`} className="local-hoy-enlace">
        <span className="rank-position">{posicion}</span>
        <div className="local-info">
          <p className="venue-name">{local.local_nombre}</p>
          <p className="local-categoria">
            {local.total_personas} {local.total_personas === 1 ? 'persona va' : 'personas van'} hoy
          </p>
          {muestra.length > 0 && (
            <div className="mini-avatares">
              {muestra.map((perfil) => (
                <span
                  key={perfil.id}
                  className="mini-avatar"
                  title={perfil.nombre || perfil.nombre_usuario || 'Usuario'}
                >
                  <ImagenConFallback src={perfil.foto_url} alt="" placeholderClassName="mini-avatar--vacio" />
                </span>
              ))}
              {extra > 0 && <span className="mini-avatares-mas">+{extra} más</span>}
            </div>
          )}
        </div>
      </Link>
    </li>
  )
}
