export default function VotoButton({ votado, cargando, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`glass-btn ${votado ? 'glass-btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled || cargando}
    >
      {votado ? 'Vas aquí ✓' : 'Voy'}
    </button>
  )
}
