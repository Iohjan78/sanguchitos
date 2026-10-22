/**
 * Devuelve el token del bot de Telegram.
 *
 * Sale de TELEGRAM_BOT_TOKEN, que se pasa por el entorno del contenedor.
 * Si falta, no hay forma de avisar nada: se corta aca con un error claro en
 * vez de fallar mas adelante con un 401 de Telegram.
 */
export async function getBotToken(): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) throw new Error('Falta TELEGRAM_BOT_TOKEN')
  return token
}
