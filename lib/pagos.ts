import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings, type SandwichOrder } from '@/lib/db/schema'

export const pesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor)

export async function leerPrecio(): Promise<number | null> {
  const [fila] = await db.select().from(settings).where(eq(settings.key, 'price'))
  return fila ? Number(fila.value) : null
}

/**
 * Renglones para Telegram con quienes pagaron, quienes no, lo recibido y el
 * total. Sin precio cargado no hay montos: se listan solo los nombres.
 */
export function resumenPagos(pedidos: SandwichOrder[], precio: number | null): string[] {
  const monto = (o: SandwichOrder) => (precio ? ` ${pesos(o.quantity * precio)}` : '')
  const linea = (o: SandwichOrder) => `• ${o.name}${monto(o)}`
  const pagaron = pedidos.filter((o) => o.paidAt)
  const faltan = pedidos.filter((o) => !o.paidAt)

  const lineas = [
    `✅ Pagaron (${pagaron.length}):`,
    ...(pagaron.length ? pagaron.map(linea) : ['• nadie todavía']),
    ``,
    `⏳ Falta pagar (${faltan.length}):`,
    ...(faltan.length ? faltan.map(linea) : ['• nadie, ya pagaron todos']),
  ]

  if (precio) {
    const total = pedidos.reduce((acc, o) => acc + o.quantity, 0) * precio
    const recibido = pagaron.reduce((acc, o) => acc + o.quantity, 0) * precio
    lineas.push(``, `Recibido: ${pesos(recibido)} de ${pesos(total)}`)
  }
  return lineas
}
