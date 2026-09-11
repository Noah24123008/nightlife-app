import { useState } from 'react'

// Fondo desenfocado (misma imagen, object-fit: cover) para rellenar el
// contenedor, con la foto real encima sin deformar ni recortar
// (object-fit: contain). Si no hay foto, o falla al cargar, cae al mismo
// tipo de placeholder que ya usa ImagenConFallback en el resto de la app.
export default function FotoLocalPanoramica({ src, alt = '' }) {
  const [fallo, setFallo] = useState(false)

  if (!src || fallo) {
    return <div className="ficha-foto-panoramica ficha-foto-panoramica--vacia" aria-hidden="true" />
  }

  return (
    <div className="ficha-foto-panoramica">
      <img
        className="ficha-foto-panoramica-fondo"
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setFallo(true)}
      />
      <img className="ficha-foto-panoramica-real" src={src} alt={alt} onError={() => setFallo(true)} />
    </div>
  )
}
