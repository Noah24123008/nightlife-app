// Icono de personas para estados vacíos (EmptyState). SVG propio, no
// emoji: evita el problema ya conocido del emoji 👥, que renderiza con un
// tinte morado fuera de paleta en algunos navegadores. Mismo estilo que
// IconoCalendario e IconoCheck — currentColor, un solo trazo, sin relleno
// sólido grande.
export default function IconoAmigos({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8.3" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.3 18.5c.5-3.3 2.9-5.4 5.7-5.4s5.2 2.1 5.7 5.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M15.2 6.2a2.7 2.7 0 1 1 0 5.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M15.6 13.3c2.2.6 3.8 2.5 4.2 5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}
