/**
 * Cria (ou atualiza) o administrador inicial a partir das variáveis
 * ADMIN_NOME, ADMIN_EMAIL, ADMIN_CPF e ADMIN_SENHA do .env.
 *
 *   npm run db:seed
 */
import { eq } from 'drizzle-orm'
import { db, fecharDb, migrar, schema } from '../src/db/client.js'
import { cpfValido, soDigitos } from '../src/lib/documentos.js'
import { gerarHashSenha } from '../src/lib/seguranca.js'

const nome = process.env.ADMIN_NOME || 'Presidente'
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const cpf = soDigitos(process.env.ADMIN_CPF || '')
const senha = process.env.ADMIN_SENHA || ''

if (!email || !senha || senha.length < 8) {
  console.error('❌ Defina ADMIN_EMAIL e ADMIN_SENHA (mínimo 8 caracteres) no .env.')
  process.exit(1)
}
if (!cpfValido(cpf)) {
  console.error('❌ Defina um ADMIN_CPF válido no .env (usado também para login por CPF).')
  process.exit(1)
}

await migrar()

const [existente] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, email))
const senhaHash = await gerarHashSenha(senha)

if (existente) {
  await db
    .update(schema.usuarios)
    .set({ perfil: 'ADMIN', status: 'APROVADO', senhaHash })
    .where(eq(schema.usuarios.id, existente.id))
  console.log(`✅ Admin ${email} atualizado (senha redefinida).`)
} else {
  await db.insert(schema.usuarios).values({
    nome,
    email,
    cpf,
    senhaHash,
    perfil: 'ADMIN',
    status: 'APROVADO',
    avaliadoEm: new Date(),
  })
  console.log(`✅ Admin ${email} criado.`)
}

await fecharDb()
