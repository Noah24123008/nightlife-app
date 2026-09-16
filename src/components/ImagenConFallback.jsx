import { useState } from 'react'

// Muestra la imagen si hay URL y carga bien; si no hay URL, o si falla al
// cargar, muestra el placeholder (un span con CSS, nunca otra imagen), así
// que no hay forma de que el propio fallback vuelva a fallar.
// textoAlternativo es opcional: si no se pasa (como en todos los usos
// existentes hasta ahora), el placeholder queda exactamente igual que
// antes, vacío.
export default function ImagenConFallback({ src, alt = '', className, placeholderClassName, textoAlternativo }) {
  const [fallo, setFallo] = useState(false)

  if (!src || fallo) {
    return (
      <span className={placeholderClassName} aria-hidden="true">
        {textoAlternativo}
      </span>
    )
  }

  return <img src={src} alt={alt} className={className} onError={() => setFallo(true)} />
}
