// Icono de luna para el aviso del día nocturno. SVG propio, no emoji: así
// el color siempre lo controla currentColor (el mismo criterio ya usado en
// IconoPersonas, tras el problema del emoji 👥 renderizando en morado en
// algunos navegadores). Se usa en línea junto al texto, sin círculo ni
// fondo propio — el color (dorado cálido) se fija desde tokens.css.
export default function IconoLuna({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.8 14.9A8.6 8.6 0 1 1 9.4 3.3a7.1 7.1 0 0 0 11.4 11.6Z"
        fill="currentColor"
      />
      <path
        d="M18.3 5.3l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}
