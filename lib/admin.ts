import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Compara la clave que manda el navegador con ADMIN_PASSWORD.
 *
 * Si la variable no esta, el admin queda cerrado para todos: mejor eso que
 * dejarlo abierto por un .env incompleto. Se comparan los hash para que
 * timingSafeEqual reciba dos buffers del mismo largo.
 */
export function claveValida(clave: string | null): boolean {
  const esperada = process.env.ADMIN_PASSWORD?.trim()
  if (!esperada || !clave) return false
  const hash = (valor: string) => createHash('sha256').update(valor).digest()
  return timingSafeEqual(hash(clave), hash(esperada))
}
