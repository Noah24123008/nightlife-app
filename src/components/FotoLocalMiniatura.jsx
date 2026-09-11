import { useState } from 'react'

// Miniatura cuadrada sin recortar: fondo desenfocado (misma imagen,
// object-fit: cover) rellena la caja, y la foto real va encima sin
// deformar (object-fit: contain). Mismo tipo de fallback que el resto
// de la app si no hay foto o falla al cargar.
export default function FotoLocalMiniatura({ src, alt = '' }) {
  const [fallo, setFallo] = useState(false)

  if (!src || fallo) {
    return <span className="local-card-foto-miniatura local-card-foto-miniatura--vacia" aria-hidden="true" />
  }

  return (
    <span className="local-card-foto-miniatura">
      <img
        className="local-card-foto-miniatura-fondo"
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setFallo(true)}
      />
      <img className="local-card-foto-miniatura-real" src={src} alt={alt} onError={() => setFallo(true)} />
    </span>
  )
}
