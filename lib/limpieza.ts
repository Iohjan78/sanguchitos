import { getBotToken } from '@/lib/telegram'
import { db } from '@/lib/db'
import { sandwichOrders, type SandwichOrder } from '@/lib/db/schema'

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? ''

// El contenedor corre en UTC; sin esto las fechas del resumen saldrian con
// 3 horas de diferencia respecto de la hora a la que la gente se anoto.
export const ZONA = 'America/Argentina/Buenos_Aires'

function fechaHora(valor: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: ZONA,
  }).format(valor)
}

async function avisarBorradoTotal(titulo: string, borrados: SandwichOrder[]) {
  try {
    const botToken = await getBotToken()
    const totalSanguchitos = borrados.reduce((acc, o) => acc + o.quantity, 0)

    // Telegram corta los mensajes en 4096 caracteres. Con muchos anotados el
    // detalle no entra, asi que se recorta y se dice cuantos quedaron afuera.
    const MAXIMO = 50
    const lineas = borrados.slice(0, MAXIMO).map((o) =>
      `• ${o.name} — ${o.quantity} ${o.quantity === 1 ? 'sanguchito' : 'sanguchitos'} — anotado el ${fechaHora(o.createdAt)}`,
    )
    if (borrados.length > MAXIMO) lineas.push(`…y ${borrados.length - MAXIMO} más`)

    const message = [
      titulo,
      `Fecha y hora del borrado: ${fechaHora(new Date())}`,
      ``,
      `Se dieron de baja ${borrados.length} ${borrados.length === 1 ? 'anotado' : 'anotados'} (${totalSanguchitos} ${totalSanguchitos === 1 ? 'sanguchito' : 'sanguchitos'}):`,
      ``,
      ...lineas,
    ].join('\n')

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
    })
  } catch (error) {
    console.error('No se pudo avisar el borrado total por Telegram:', error)
  }
}

/**
 * Borra TODA la lista y manda el detalle al bot. La usan el boton "Limpiar
 * lista" y el reinicio automatico de los jueves; cambia solo el titulo.
 *
 * Antes de borrar se lee lo que habia, porque el resumen que se manda al bot
 * es el unico registro que queda de quienes estaban anotados.
 */
export async function borrarLista(titulo: string): Promise<number> {
  const borrados = await db
    .delete(sandwichOrders)
    .returning()

  if (!borrados.length) return 0

  borrados.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  await avisarBorradoTotal(titulo, borrados)

  return borrados.length
}
