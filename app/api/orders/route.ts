import { getBotToken } from '@/lib/telegram'
import { count, desc, sum } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sandwichOrders } from '@/lib/db/schema'
import { borrarLista } from '@/lib/limpieza'

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

// Borra TODA la lista. Sin clave: la lista es interna.
export async function DELETE() {
  const borrados = await borrarLista('Se borró la lista completa')
  return NextResponse.json({ ok: true, borrados })
}
