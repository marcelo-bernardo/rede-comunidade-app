import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

const transporte = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

/** Últimos e-mails "enviados" — usado nos testes quando não há SMTP. */
export const caixaDeSaida: { para: string; assunto: string; texto: string }[] = []

export async function enviarEmail(para: string, assunto: string, texto: string) {
  if (!transporte) {
    caixaDeSaida.push({ para, assunto, texto })
    if (env.NODE_ENV !== 'test') {
      console.log(`📧 [sem SMTP] Para: ${para}\n   Assunto: ${assunto}\n   ${texto.replace(/\n/g, '\n   ')}`)
    }
    return
  }
  await transporte.sendMail({ from: env.SMTP_FROM, to: para, subject: assunto, text: texto })
}
