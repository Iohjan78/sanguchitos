import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

// El archivo vive en un volumen de Docker. Si estuviera adentro del contenedor
// se borraria en cada rebuild, que es el unico riesgo real de usar SQLite.
const ARCHIVO = process.env.SQLITE_PATH ?? '/app/data/sanguchitos.db'

const globalForDb = globalThis as unknown as { sqlite?: Database.Database }

function abrir(): Database.Database {
  mkdirSync(dirname(ARCHIVO), { recursive: true })
  const sqlite = new Database(ARCHIVO)

  // WAL deja que se lea mientras alguien escribe. Sin esto, con dos personas
  // anotandose al mismo tiempo una recibe SQLITE_BUSY.
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // Reemplaza al init.sql que corria Postgres al crear el volumen. Aca el
  // esquema se asegura al abrir: es una sola tabla y es idempotente.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sandwich_orders (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      quantity    INTEGER NOT NULL,
      created_at  INTEGER NOT NULL
    );
  `)

  return sqlite
}

const sqlite = globalForDb.sqlite ?? abrir()

if (process.env.NODE_ENV !== 'production') globalForDb.sqlite = sqlite

export { sqlite }
export const db = drizzle(sqlite, { schema })
