import { db, schema } from '../db/client.js'

/** Registra ações relevantes (aprovações, alterações em dados sociais, etc.). */
export async function auditar(
  usuarioId: string | null,
  acao: string,
  entidade: string,
  entidadeId?: string | null,
  detalhes?: Record<string, unknown>,
) {
  try {
    await db.insert(schema.auditoria).values({ usuarioId, acao, entidade, entidadeId, detalhes })
  } catch (e) {
    // Auditoria nunca deve derrubar a operação principal.
    console.error('Falha ao gravar auditoria', e)
  }
}
