import path from 'node:path'
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'
import { env } from '../config/env.js'
import * as schema from './schema.js'

/**
 * Com DATABASE_URL usa PostgreSQL de verdade (produção). Sem ela, usa PGlite —
 * o próprio Postgres compilado para WebAssembly, rodando dentro do processo
 * Node. Assim o projeto roda e é testado sem instalar nada.
 */
export type Db = NodePgDatabase<typeof schema>

const migrationsFolder = path.resolve(process.cwd(), 'drizzle')

let pool: pg.Pool | undefined
let pglite: PGlite | undefined

function criar(): Db {
  if (env.DATABASE_URL) {
    const precisaSsl = /sslmode=require/.test(env.DATABASE_URL)
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      ssl: precisaSsl ? { rejectUnauthorized: false } : undefined,
    })
    return drizzlePg(pool, { schema })
  }
  pglite = new PGlite(env.PGLITE_DIR)
  return drizzlePglite(pglite, { schema }) as unknown as Db
}

export const db = criar()

export async function migrar() {
  if (pool) await migratePg(db, { migrationsFolder })
  else await migratePglite(db as never, { migrationsFolder })
}

export async function fecharDb() {
  await pool?.end()
  await pglite?.close()
}

export { schema }
