import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const sandwichOrders = sqliteTable('sandwich_orders', {
  // SQLite no tiene tipo uuid ni gen_random_uuid(): el id se genera aca, en
  // Node, y se guarda como texto. Sigue siendo un uuid, cambia quien lo arma.
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull(),
  // Tampoco hay timestamptz: se guarda el epoch en segundos y drizzle lo
  // devuelve como Date, asi que el resto del codigo no se entera.
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export type SandwichOrder = typeof sandwichOrders.$inferSelect

// Datos que carga el admin y se muestran en la landing (alias para
// transferir y precio por sanguchito). Clave/valor: son dos datos sueltos y
// no vale la pena una tabla con columnas fijas para eso.
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
