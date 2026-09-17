import { Link } from 'react-router-dom'

// Estado vacío compartido por toda la app — icono pequeño (opcional),
// título corto, frase secundaria, y una acción opcional solo cuando existe
// una ruta o función real a la que llevar (nunca se inventa un botón).
// accion: { texto, href } para un enlace real, o { texto, onClick } para
// una acción (p. ej. compartir). No mezclar los dos en el mismo uso.
export default function EmptyState({ icono, titulo, texto, accion }) {
  return (
    <div className="empty-state">
      {icono && (
        <span className="empty-state-icono" aria-hidden="true">
          {icono}
        </span>
      )}
      {titulo && <p className="empty-state-titulo">{titulo}</p>}
      {texto && <p className="empty-state-texto">{texto}</p>}
      {accion &&
        (accion.href ? (
          <Link to={accion.href} className="empty-state-cta">
            {accion.texto}
          </Link>
        ) : (
          <button type="button" className="empty-state-cta" onClick={accion.onClick}>
            {accion.texto}
          </button>
        ))}
    </div>
  )
}
