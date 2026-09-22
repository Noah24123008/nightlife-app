import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

// Arreglo necesario: con Vite, Leaflet no encuentra solo sus iconos de
// marcador por defecto porque reescribe las rutas de los assets al empaquetar.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const CENTRO_GIJON = [43.5357, -5.6615]

// Si este mapa vive dentro de un panel que se oculta con `hidden` (paneles
// persistentes de Locales/Eventos/Mapa) en vez de desmontarse, Leaflet
// puede no recalcular correctamente sus tiles al volver a mostrarse —
// comportamiento conocido y documentado de Leaflet, no un fallo de esta
// app. ResizeObserver detecta el cambio de tamaño real del contenedor
// (incluido pasar de 0×0 oculto a su tamaño visible) y dispara
// invalidateSize() en cada caso, sin depender de que nadie le avise de que
// ahora es visible.
function InvalidadorDeTamano() {
  const map = useMap()

  useEffect(() => {
    const contenedor = map.getContainer()
    const observador = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observador.observe(contenedor)
    return () => observador.disconnect()
  }, [map])

  return null
}

// No hace ninguna consulta propia: recibe los locales ya cargados por quien
// lo use (Mapa.jsx o Locales.jsx), para no duplicar ni repetir peticiones.
export default function MapaLocales({ locales }) {
  const conUbicacion = useMemo(
    () => locales.filter((local) => typeof local.latitud === 'number' && typeof local.longitud === 'number'),
    [locales]
  )

  return (
    <div className="mapa-contenedor">
      <MapContainer center={CENTRO_GIJON} zoom={14} scrollWheelZoom className="mapa-leaflet">
        <InvalidadorDeTamano />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {conUbicacion.map((local) => (
          <Marker key={local.id} position={[local.latitud, local.longitud]}>
            <Popup>
              <p className="mapa-popup-nombre">{local.nombre}</p>
              {local.categoria && <p className="mapa-popup-detalle">{local.categoria}</p>}
              {local.direccion && <p className="mapa-popup-detalle">{local.direccion}</p>}
              <Link to={`/locales/${local.id}`}>Ver local →</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
