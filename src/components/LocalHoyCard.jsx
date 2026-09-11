import { Link } from 'react-router-dom'
import ImagenConFallback from './ImagenConFallback'

export default function LocalHoyCard({ local, posicion, destacado, yoVotadoAqui = false }) {
  const muestra = local.muestra_perfiles || []
  // total_personas cuenta a todos (incluido el propio usuario, si votó
  // aquí). muestra solo trae amigos, así que para no contar al propio
  // usuario dos veces (una vez como "conocido" implícito, otra dentro del
  // "+X más" de desconocidos), se resta explícitamente si corresponde.
  const totalConocido = muestra.length + (yoVotadoAqui ? 1 : 0)
  const extra = Math.max(0, local.total_personas - totalConocido)

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
            </div>
          )}
          {(muestra.length > 0 || extra > 0) && (
            <p className="mini-avatares-mas">
              {muestra.length > 0 && (
                <>
                  {muestra.length} {muestra.length === 1 ? 'amigo visible' : 'amigos visibles'}
                </>
              )}
              {muestra.length > 0 && extra > 0 && ' + '}
              {extra > 0 && (
                <>
                  {extra} {extra === 1 ? 'persona más' : 'personas más'}
                </>
              )}
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}
