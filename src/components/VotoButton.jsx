export default function VotoButton({ votado, cargando, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`voto-btn ${votado ? 'voto-btn--activo' : ''}`}
      onClick={onClick}
      disabled={disabled || cargando || votado}
    >
      {cargando ? '...' : votado ? 'Vas aquí ✓' : 'Voy'}
    </button>
  )
}
