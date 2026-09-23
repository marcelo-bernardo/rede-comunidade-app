/** Erro de negócio com status HTTP e mensagem pronta para exibir ao usuário. */
export class ErroApi extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo = 'ERRO',
    public detalhes?: unknown,
  ) {
    super(message)
  }
}

export const naoEncontrado = (o = 'Registro') => new ErroApi(404, `${o} não encontrado.`, 'NAO_ENCONTRADO')
export const proibido = (m = 'Você não tem permissão para esta ação.') => new ErroApi(403, m, 'PROIBIDO')
export const conflito = (m: string, detalhes?: unknown) => new ErroApi(409, m, 'CONFLITO', detalhes)
export const regraNegocio = (m: string) => new ErroApi(422, m, 'REGRA_NEGOCIO')
export const naoAutenticado = (m = 'Sessão expirada. Faça login novamente.') =>
  new ErroApi(401, m, 'NAO_AUTENTICADO')
