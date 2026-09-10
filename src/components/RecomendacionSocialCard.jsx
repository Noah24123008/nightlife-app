import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'

export default function RecomendacionSocialCard({ recomendacion }) {
  const muestra = recomendacion.muestra_seguidos || []

  return (
    <Link to={`/locales/${recomendacion.local_id}`} className="recomendacion-card">
      <p className="venue-name">{recomendacion.local_nombre}</p>
      <p className="local-categoria">
        {recomendacion.seguidos_que_van}{' '}
        {recomendacion.seguidos_que_van === 1 ? 'persona que sigues va' : 'personas que sigues van'} ·{' '}
        {recomendacion.total_personas} {recomendacion.total_personas === 1 ? 'persona en total' : 'personas en total'}
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
        </div>
      )}
    </Link>
  )
}
