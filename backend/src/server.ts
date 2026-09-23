import { criarApp } from './app.js'
import { env } from './config/env.js'
import { fecharDb, migrar } from './db/client.js'

// Aplica migrações pendentes antes de aceitar requisições.
await migrar()

const servidor = criarApp().listen(env.PORT, '0.0.0.0', () => {
  const banco = env.DATABASE_URL ? 'PostgreSQL' : `PGlite (${env.PGLITE_DIR})`
  console.log(`🚀 API da Rede Comunidade em http://localhost:${env.PORT} — banco: ${banco}`)
})

async function encerrar() {
  servidor.close()
  await fecharDb()
  process.exit(0)
}
process.on('SIGTERM', encerrar)
process.on('SIGINT', encerrar)
