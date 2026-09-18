// Reglas de username: minúsculas, letras/números/guion bajo, 3-20
// caracteres. Reutilizable desde cualquier pantalla que necesite validar
// o normalizar un username antes de guardarlo.
const REGEX_USERNAME = /^[a-z0-9_]{3,20}$/

export function normalizarUsername(valor) {
  return (valor ?? '').trim().toLowerCase()
}

export function formatoUsernameValido(valor) {
  return REGEX_USERNAME.test(valor)
}
