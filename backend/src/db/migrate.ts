import { fecharDb, migrar } from './client.js'

await migrar()
console.log('✅ Migrações aplicadas.')
await fecharDb()
