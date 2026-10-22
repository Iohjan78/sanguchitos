import { getBotToken } from '@/lib/telegram'
import { count, desc, sum } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sandwichOrders, type SandwichOrder } from '@/lib/db/schema'

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? ''

async function notifyTelegram(
  name: string,
  quantity: number,
  total: number,
  personas: number,
) {
  const botToken = await getBotToken()
  const message = [
    `Nuevo pedido para el viernes de sanguchitos`,
    ``,
    `Nombre: ${name}`,
    `Cantidad: ${quantity}`,
    ``,
    `Total anotado: ${total} ${total === 1 ? 'sanguchito' : 'sanguchitos'}`,
    `Somos ${personas} ${personas === 1 ? 'persona' : 'personas'}`,
  ].join('\n')
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
  })

  if (!response.ok) throw new Error('Telegram notification failed')
}

// El contenedor corre en UTC; sin esto las fechas del resumen saldrian con
// 3 horas de diferencia respecto de la hora a la que la gente se anoto.
const ZONA = 'America/Argentina/Buenos_Aires'

function fechaHora(valor: Date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: ZONA,
  }).format(valor)
}

async function avisarBorradoTotal(borrados: SandwichOrder[]) {
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
      `Se borró la lista completa`,
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

export async function GET() {
  const orders = await db
    .select()
    .from(sandwichOrders)
    .orderBy(desc(sandwichOrders.createdAt))

  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const quantity = Number(body.quantity)

  if (!name || name.length > 80 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return NextResponse.json({ error: 'Ingresá un nombre y una cantidad válida.' }, { status: 400 })
  }

  const [order] = await db
    .insert(sandwichOrders)
    .values({ name, quantity })
    .returning()

  // count() cuenta renglones, o sea cuantas veces se anoto alguien. Si la
  // misma persona se anota dos veces cuenta dos, igual que en la lista.
  const [totals] = await db
    .select({
      total: sum(sandwichOrders.quantity),
      personas: count(),
    })
    .from(sandwichOrders)

  let telegramSent = true
  try {
    await notifyTelegram(
      name,
      quantity,
      Number(totals?.total ?? 0),
      Number(totals?.personas ?? 0),
    )
  } catch {
    telegramSent = false
  }

  return NextResponse.json({ ...order, telegramSent }, { status: 201 })
}

// Borra TODA la lista. Sin clave: la lista es interna. Antes de borrar se lee
// lo que habia, porque el resumen que se manda al bot es el unico registro
// que queda de quienes estaban anotados.
export async function DELETE() {
  const borrados = await db
    .delete(sandwichOrders)
    .returning()

  if (!borrados.length) {
    return NextResponse.json({ ok: true, borrados: 0 })
  }

  borrados.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  await avisarBorradoTotal(borrados)

  return NextResponse.json({ ok: true, borrados: borrados.length })
}
