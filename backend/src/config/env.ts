import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().optional().default(''),
  PGLITE_DIR: z.string().default('./.pglite'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DIAS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default(''),
  LIMIAR_VALIDACAO_ROTA: z.coerce.number().int().min(1).default(3),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('Rede Comunidade <nao-responda@comunidade.com>'),
  RESET_SENHA_URL: z.string().default('rede-comunidade://redefinir-senha?token={token}'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

if (parsed.data.NODE_ENV === 'production' && !parsed.data.DATABASE_URL) {
  console.error('❌ DATABASE_URL é obrigatória em produção.')
  process.exit(1)
}

export const env = parsed.data
