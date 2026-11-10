import { eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { claveValida } from '@/lib/admin'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'

// Lo lee cualquiera: es lo que muestra la landing.
export async function GET() {
  const filas = await db.select().from(settings).where(inArray(settings.key, ['alias', 'price', 'aliasUpdatedAt']))
  const valores = Object.fromEntries(filas.map((fila) => [fila.key, fila.value]))

  return NextResponse.json({
    alias: valores.alias ?? '',
    price: valores.price ? Number(valores.price) : null,
    aliasUpdatedAt: valores.aliasUpdatedAt ?? null,
  })
}

// Solo con la clave de admin.
export async function PUT(request: Request) {
  if (!claveValida(request.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: 'Clave incorrecta.' }, { status: 401 })
  }

  const body = await request.json()
  const alias = typeof body.alias === 'string' ? body.alias.trim() : ''
  const price = Number(body.price)

  // El precio va en pesos enteros: nadie transfiere centavos por un sanguchito.
  if (!alias || alias.length > 60 || !Number.isInteger(price) || price < 1 || price > 1_000_000) {
    return NextResponse.json({ error: 'Revisá el alias y el precio.' }, { status: 400 })
  }

  // La fecha es de cuando se puso el alias, no de cualquier guardado: si solo
  // cambia el precio, la fecha del alias queda como estaba.
  const [anterior] = await db.select().from(settings).where(eq(settings.key, 'alias'))
  const cambios = [['alias', alias], ['price', String(price)]]
  if (anterior?.value !== alias) cambios.push(['aliasUpdatedAt', new Date().toISOString()])

  for (const [key, value] of cambios) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
  }

  return NextResponse.json({ alias, price })
}

// Borra alias, fecha y precio. Tambien solo con la clave de admin.
export async function DELETE(request: Request) {
  if (!claveValida(request.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: 'Clave incorrecta.' }, { status: 401 })
  }

  await db.delete(settings).where(inArray(settings.key, ['alias', 'aliasUpdatedAt', 'price']))
  return NextResponse.json({ ok: true })
}
