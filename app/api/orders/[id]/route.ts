import { asc, eq, sum } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sandwichOrders } from '@/lib/db/schema'
import { leerPrecio, pesos, resumenPagos } from '@/lib/pagos'
import { getBotToken } from '@/lib/telegram'

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? ''

// Igual que en el alta: si avisar falla, la baja ya quedo hecha y no queremos
// que el error vuelva al navegador. Se registra y sigue.
async function avisarBaja(name: string, quantity: number, total: number) {
  try {
    const botToken = await getBotToken()
    const message = `Se dio de baja del viernes de sanguchitos\n\nNombre: ${name}\nCantidad: ${quantity}\nTotal anotado ahora: ${total}`
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
    })
  } catch (error) {
    console.error('No se pudo avisar la baja por Telegram:', error)
  }
}

// Mismo criterio que la baja: si Telegram falla, la marca ya quedo guardada.
async function avisarPago(name: string, quantity: number, pagado: boolean) {
  try {
    const botToken = await getBotToken()
    const precio = await leerPrecio()
    const pedidos = await db.select().from(sandwichOrders).orderBy(asc(sandwichOrders.createdAt))
    const monto = precio ? ` ${pesos(precio * quantity)}` : ''
    const detalle = `${quantity} ${quantity === 1 ? 'sanguchito' : 'sanguchitos'}`
    const message = [
      pagado ? `${name} marcó que pagó${monto} (${detalle})` : `${name} desmarcó el pago${monto} (${detalle})`,
      ``,
      ...resumenPagos(pedidos, precio),
    ].join('\n')
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
    })
  } catch (error) {
    console.error('No se pudo avisar el pago por Telegram:', error)
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Marca o desmarca el pago. Sin clave, igual que la baja: cada uno marca su fila.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) {
    return NextResponse.json({ error: 'Pedido inexistente.' }, { status: 404 })
  }

  const body = await request.json()
  if (typeof body.paid !== 'boolean') {
    return NextResponse.json({ error: 'Falta indicar si pagó.' }, { status: 400 })
  }

  const [pedido] = await db
    .update(sandwichOrders)
    .set({ paidAt: body.paid ? new Date() : null })
    .where(eq(sandwichOrders.id, id))
    .returning()

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido inexistente.' }, { status: 404 })
  }

  await avisarPago(pedido.name, pedido.quantity, body.paid)

  return NextResponse.json(pedido)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // El id es uuid: si no tiene esa forma, la consulta a Postgres explota.
  if (!UUID.test(id)) {
    return NextResponse.json({ error: 'Pedido inexistente.' }, { status: 404 })
  }

  const [borrado] = await db
    .delete(sandwichOrders)
    .where(eq(sandwichOrders.id, id))
    .returning()

  // Sin fila devuelta, no existia: puede ser que otro lo borro primero.
  if (!borrado) {
    return NextResponse.json({ error: 'Pedido inexistente.' }, { status: 404 })
  }

  const [totals] = await db
    .select({ total: sum(sandwichOrders.quantity) })
    .from(sandwichOrders)
  const total = Number(totals?.total ?? 0)

  await avisarBaja(borrado.name, borrado.quantity, total)

  return NextResponse.json({ ok: true, total })
}
