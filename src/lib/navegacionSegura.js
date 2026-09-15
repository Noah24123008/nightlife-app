// Construye un destino de navegación seguro a partir de location.state.from
// (guardado por ProtectedRoute). Solo se acepta si es un objeto "location"
// real de React Router, con un pathname que empiece por "/" — nunca una
// cadena arbitraria ni una URL externa. Si no es válido, cae a "/".
// navigate() de React Router solo puede moverse dentro de la SPA, así que
// esto nunca puede acabar en una redirección fuera de la aplicación.
export function destinoSeguro(from) {
  if (from && typeof from.pathname === 'string' && from.pathname.startsWith('/')) {
    return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
  }
  return '/'
}
