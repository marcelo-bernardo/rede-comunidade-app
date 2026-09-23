import { z } from 'zod'

// Mesmos valores de mobile/src/lib/types.ts — manter os dois em sincronia.
export const TIPOS_ROTA = ['Caminho a pé', 'Acesso de veículo', 'Rota de transporte', 'Rota escolar', 'Coleta de lixo', 'Rota de emergência'] as const
export const CONDICOES = ['Boa', 'Regular', 'Ruim', 'Intransitável'] as const
export const TIPOS_ALERTA = ['Alagamento', 'Buraco na via', 'Sem iluminação', 'Risco de deslizamento', 'Lixo acumulado', 'Falta de água', 'Ponto de risco'] as const
export const GRAVIDADES = ['Baixa', 'Média', 'Alta'] as const
export const CATEGORIAS_COMERCIO = ['Alimentação', 'Mercearia / Mercado', 'Vestuário', 'Beleza', 'Material de construção', 'Farmácia / Saúde', 'Papelaria', 'Serviços gerais', 'Outro'] as const
export const DISPONIBILIDADES = ['Manhã', 'Tarde', 'Noite', 'Fim de semana', 'Integral'] as const
export const UNIDADES_PRECO = ['hora', 'diária', 'serviço'] as const
export const TIPOS_CONSTRUCAO = ['Alvenaria', 'Madeira', 'Mista', 'Improvisada'] as const
export const SITUACOES_MORADIA = ['Própria', 'Alugada', 'Cedida', 'Ocupação'] as const
export const RISCOS = ['Alagamento', 'Deslizamento', 'Incêndio', 'Estrutural'] as const
export const PARENTESCOS = ['Responsável', 'Cônjuge', 'Filho(a)', 'Neto(a)', 'Pai/Mãe', 'Irmão(ã)', 'Outro'] as const
export const ESCOLARIDADES = ['Não alfabetizado', 'Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior'] as const
export const BENEFICIOS = ['Bolsa Família', 'BPC', 'Auxílio Gás', 'Tarifa Social de Energia', 'Cesta básica', 'Nenhum'] as const

/** Distância abaixo da qual um novo alerta aberto do mesmo tipo é considerado duplicado. */
export const RAIO_ALERTA_DUPLICADO_M = 30

export const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const texto = (max = 500) => z.string().trim().max(max)
export const textoObrigatorio = (max = 120) => z.string().trim().min(1, 'Campo obrigatório').max(max)
export const listaTags = z.array(z.string().trim().min(1).max(40)).max(30)
export const uuidParam = z.object({ id: z.uuid('Identificador inválido') })
