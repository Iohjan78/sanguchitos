import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { borrarLista, ZONA } from '@/lib/limpieza'

// Todos los jueves a las 15 (hora argentina) se arranca de cero: se borra la
// lista de pedidos, el alias con su fecha y el precio.
//
// Argentina no tiene horario de verano desde 2009: las 15 de alla son
// siempre las 18 UTC. Por eso alcanza con hacer la cuenta en UTC.
const JUEVES = 4
const HORA_UTC = 18

// El ultimo jueves 18 UTC que ya paso (puede ser hoy mismo).
function ultimoCorte(ahora: Date): Date {
  const corte = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), HORA_UTC))
  corte.setUTCDate(corte.getUTCDate() - ((ahora.getUTCDay() - JUEVES + 7) % 7))
  if (corte > ahora) corte.setUTCDate(corte.getUTCDate() - 7)
  return corte
}

async function leerUltimoReinicio(): Promise<Date | null> {
  const [fila] = await db.select().from(settings).where(eq(settings.key, 'lastWeeklyReset'))
  return fila ? new Date(fila.value) : null
}

async function guardarUltimoReinicio(valor: Date) {
  await db
    .insert(settings)
    .values({ key: 'lastWeeklyReset', value: valor.toISOString() })
    .onConflictDoUpdate({ target: settings.key, set: { value: valor.toISOString() } })
}

async function revisar() {
  const ahora = new Date()
  const corte = ultimoCorte(ahora)
  const ultimo = await leerUltimoReinicio()

  // Primera vez que corre: se toma como punto de partida y no se borra nada.
  // Si no, cada deploy nuevo borraria la lista que ya estaba cargada.
  if (!ultimo) return guardarUltimoReinicio(ahora)

  // Ya se hizo el de esta semana. Si el servidor estuvo apagado a las 15, la
  // revision del arranque lo detecta y lo hace en ese momento.
  if (ultimo >= corte) return

  // Se marca antes de borrar: si algo falla a la mitad, mejor que no se
  // repita mandando el mismo resumen al bot.
  await guardarUltimoReinicio(ahora)
  await db.delete(settings).where(inArray(settings.key, ['alias', 'aliasUpdatedAt', 'price']))
  const borrados = await borrarLista('Reinicio automático del jueves: se borró la lista completa')
  console.log(`Reinicio del jueves: ${borrados} pedidos borrados, alias y precio limpios.`)
}

// En vez de revisar cada minuto, se programa un solo timer para el proximo
// jueves a las 15 y, cuando salta, se programa el siguiente. Una semana entra
// en setTimeout (el maximo son ~24 dias).
function programarProximo() {
  const ahora = new Date()
  const proximo = ultimoCorte(ahora)
  proximo.setUTCDate(proximo.getUTCDate() + 7)
  console.log(`Proximo reinicio del jueves: ${proximo.toLocaleString('es-AR', { timeZone: ZONA, hourCycle: 'h23' })}`)
  setTimeout(() => correr().finally(programarProximo), proximo.getTime() - ahora.getTime())
}

const correr = () => revisar().catch((error) => console.error('Fallo el reinicio del jueves:', error))

export function iniciarReinicioSemanal() {
  // Una revision al arrancar, por si el servidor estaba apagado el jueves a
  // las 15: ahi el timer no corrio y el borrado quedo pendiente.
  correr().finally(programarProximo)
}
