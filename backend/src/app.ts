import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { sql } from 'drizzle-orm'
import { env } from './config/env.js'
import { db } from './db/client.js'
import { naoEncontrada, tratarErros } from './middlewares/http.js'
import { adminRouter, painelRouter } from './modules/admin.js'
import { authRouter } from './modules/auth.js'
import { guiaRouter } from './modules/guia.js'
import { mapaRouter } from './modules/mapa.js'
import { socialRouter } from './modules/social.js'
import { usuariosRouter } from './modules/usuarios.js'

export function criarApp() {
  const app = express()

  // Atrás de proxy (Render, Railway, Fly) o IP real vem no X-Forwarded-For —
  // necessário para o rate limit funcionar por usuário e não por proxy.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(helmet())
  const origens = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  app.use(cors({ origin: origens.length ? origens : true }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', async (_req, res) => {
    await db.execute(sql`select 1`)
    res.json({ status: 'ok', horario: new Date().toISOString() })
  })

  app.use('/auth', authRouter)
  app.use('/usuarios', usuariosRouter)
  app.use('/painel', painelRouter)
  app.use('/admin', adminRouter)
  app.use('/', mapaRouter) // /rotas, /alertas
  app.use('/', guiaRouter) // /comercios, /freelancers
  app.use('/', socialRouter) // /casas, /familias

  app.use(naoEncontrada)
  app.use(tratarErros)
  return app
}
