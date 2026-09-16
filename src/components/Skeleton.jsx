// Skeletons de carga — cada forma ocupa aproximadamente el mismo espacio
// que su contenido real equivalente, para no provocar saltos de layout al
// llegar los datos. Solo son marcado visual: no llevan lógica, no tocan
// ningún estado de carga existente, solo se renderizan en su lugar.

// Fila de ranking (Inicio): número + miniatura 56x56 + 2 líneas + botón.
export function SkeletonRankingFila() {
  return (
    <li className="local-item skeleton-fila" aria-hidden="true">
      <span className="skeleton skeleton-linea" style={{ width: 18, height: 18, flex: '0 0 auto' }} />
      <span className="skeleton" style={{ width: 56, height: 56, borderRadius: 8, flex: '0 0 auto' }} />
      <span className="skeleton-columna">
        <span className="skeleton skeleton-linea skeleton-linea--media" />
        <span className="skeleton skeleton-linea skeleton-linea--corta" style={{ height: 10 }} />
      </span>
      <span className="skeleton skeleton-pill" style={{ width: 56, height: 30, flex: '0 0 auto' }} />
    </li>
  )
}

// Tarjeta de Locales.jsx: miniatura 56x56 + nombre + categoría/dirección.
export function SkeletonLocalCard() {
  return (
    <div className="local-card skeleton-fila" aria-hidden="true">
      <span className="skeleton" style={{ width: 56, height: 56, borderRadius: 8, flex: '0 0 auto' }} />
      <span className="skeleton-columna">
        <span className="skeleton skeleton-linea skeleton-linea--media" />
        <span className="skeleton skeleton-linea skeleton-linea--corta" style={{ height: 10 }} />
      </span>
    </div>
  )
}

// Fila de persona (Social, ListaSeguimiento, Buscar): avatar 28px + nombre
// + username.
export function SkeletonPersonaFila() {
  return (
    <div className="skeleton-fila" style={{ padding: '10px 2px' }} aria-hidden="true">
      <span className="skeleton skeleton-circulo" style={{ width: 28, height: 28 }} />
      <span className="skeleton-columna" style={{ gap: 6 }}>
        <span className="skeleton skeleton-linea skeleton-linea--media" style={{ height: 11 }} />
        <span className="skeleton skeleton-linea skeleton-linea--corta" style={{ height: 9 }} />
      </span>
    </div>
  )
}

// Pantalla completa de FichaLocal/FichaEvento mientras cargan: hero +
// título + metadata + botón + "Quién va". Misma forma para ambas, ya que
// comparten exactamente esa estructura.
export function SkeletonFicha() {
  return (
    <div aria-hidden="true">
      <span className="skeleton" style={{ display: 'block', width: '100%', height: 240, borderRadius: 0 }} />
      <div style={{ padding: '20px 20px 0' }}>
        <span className="skeleton skeleton-linea skeleton-linea--larga" style={{ height: 22, marginBottom: 10 }} />
        <span
          className="skeleton skeleton-linea skeleton-linea--corta"
          style={{ height: 12, marginBottom: 20, display: 'block' }}
        />
        <span
          className="skeleton"
          style={{ display: 'block', width: '100%', height: 56, borderRadius: 16, marginBottom: 20 }}
        />
        <span className="skeleton skeleton-linea skeleton-linea--corta" style={{ height: 14, marginBottom: 12 }} />
        <div className="skeleton-fila">
          <span className="skeleton skeleton-circulo" style={{ width: 28, height: 28 }} />
          <span className="skeleton skeleton-circulo" style={{ width: 28, height: 28, marginLeft: -10 }} />
          <span className="skeleton skeleton-circulo" style={{ width: 28, height: 28, marginLeft: -10 }} />
        </div>
      </div>
    </div>
  )
}

// Avatar + nombre + stats de PerfilPublico.
export function SkeletonPerfil() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }} aria-hidden="true">
      <span className="skeleton skeleton-circulo" style={{ width: 108, height: 108 }} />
      <span className="skeleton skeleton-linea skeleton-linea--media" style={{ height: 16 }} />
      <div className="skeleton-fila" style={{ marginTop: 8 }}>
        <span className="skeleton" style={{ width: 64, height: 44, borderRadius: 14 }} />
        <span className="skeleton" style={{ width: 64, height: 44, borderRadius: 14 }} />
      </div>
    </div>
  )
}
