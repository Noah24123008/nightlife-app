import { useNavigate } from 'react-router-dom'

// Usa el índice de historial que React Router ya guarda internamente para
// saber si hay un paso previo real dentro de la app (por ejemplo, si se
// entró directo a esta pantalla por un enlace compartido, no lo hay). Si
// no lo hay, en vez de arriesgarse a sacar al usuario de la aplicación,
// cae siempre a la misma ruta de seguridad: Inicio.
export default function BackButton() {
  const navigate = useNavigate()

  function handleClick() {
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <button type="button" className="glass-btn back-btn" onClick={handleClick}>
      ← Atrás
    </button>
  )
}
