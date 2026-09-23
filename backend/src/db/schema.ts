import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Os valores permitidos (tipos de rota, gravidades, etc.) são validados na API
// com zod — ver src/lib/dominio.ts. No banco ficam como texto para que novas
// opções não exijam migração.

export type LatLng = { lat: number; lng: number }

export type Membro = {
  id: string
  nome: string
  nascimento: string
  parentesco: string
  escolaridade: string
  estuda: boolean
  trabalha: boolean
  pcd: boolean
  doencaCronica: boolean
  gestante: boolean
}

export type MembroCadastro = { nome: string; idade: number; escolaridade: string }

const criadoEm = () => timestamp('criado_em', { withTimezone: true }).notNull().defaultNow()
const atualizadoEm = () =>
  timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

// ---------------------------------------------------------------------------
// Usuários e autenticação
// ---------------------------------------------------------------------------

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  cpf: text('cpf').notNull().unique(),
  telefone: text('telefone').notNull().default(''),
  rua: text('rua').notNull().default(''),
  senhaHash: text('senha_hash').notNull(),
  perfil: text('perfil', { enum: ['MORADOR', 'ADMIN'] }).notNull().default('MORADOR'),
  status: text('status', { enum: ['PENDENTE', 'APROVADO', 'REJEITADO'] })
    .notNull()
    .default('PENDENTE'),
  composicaoFamiliar: jsonb('composicao_familiar').$type<MembroCadastro[]>().notNull().default([]),
  motivoRecusa: text('motivo_recusa'),
  avaliadoPor: uuid('avaliado_por'),
  avaliadoEm: timestamp('avaliado_em', { withTimezone: true }),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    revogadoEm: timestamp('revogado_em', { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [index('refresh_tokens_usuario_idx').on(t.usuarioId)],
)

export const resetsSenha = pgTable('resets_senha', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  usadoEm: timestamp('usado_em', { withTimezone: true }),
  criadoEm: criadoEm(),
})

// ---------------------------------------------------------------------------
// Mapa colaborativo
// ---------------------------------------------------------------------------

export const rotas = pgTable('rotas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
  condicao: text('condicao').notNull(),
  iluminacao: boolean('iluminacao').notNull().default(false),
  acessivel: boolean('acessivel').notNull().default(false),
  descricao: text('descricao').notNull().default(''),
  pontos: jsonb('pontos').$type<LatLng[]>().notNull(),
  status: text('status', { enum: ['pendente', 'validada', 'recusada'] })
    .notNull()
    .default('pendente'),
  autorId: uuid('autor_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadaEm: timestamp('criada_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: atualizadoEm(),
})

export const alertas = pgTable(
  'alertas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: text('tipo').notNull(),
    gravidade: text('gravidade').notNull(),
    descricao: text('descricao').notNull().default(''),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    resolvido: boolean('resolvido').notNull().default(false),
    resolvidoEm: timestamp('resolvido_em', { withTimezone: true }),
    resolvidoPor: uuid('resolvido_por').references(() => usuarios.id, { onDelete: 'set null' }),
    autorId: uuid('autor_id').references(() => usuarios.id, { onDelete: 'set null' }),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index('alertas_abertos_idx').on(t.resolvido, t.tipo)],
)

/** Confirmação de um morador de que uma rota/alerta existe como descrito. */
export const confirmacoes = pgTable(
  'confirmacoes',
  {
    alvoTipo: text('alvo_tipo', { enum: ['rota', 'alerta'] }).notNull(),
    alvoId: uuid('alvo_id').notNull(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    criadoEm: criadoEm(),
  },
  (t) => [primaryKey({ columns: [t.alvoTipo, t.alvoId, t.usuarioId] })],
)

// ---------------------------------------------------------------------------
// Comércios e freelancers
// ---------------------------------------------------------------------------

export const comercios = pgTable('comercios', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  responsavel: text('responsavel').notNull().default(''),
  categoria: text('categoria').notNull(),
  descricao: text('descricao').notNull().default(''),
  telefone: text('telefone').notNull().default(''),
  whatsapp: boolean('whatsapp').notNull().default(false),
  endereco: text('endereco').notNull().default(''),
  horario: text('horario').notNull().default(''),
  formalizado: boolean('formalizado').notNull().default(false),
  cnpjMei: text('cnpj_mei').notNull().default(''),
  aceitaFiado: boolean('aceita_fiado').notNull().default(false),
  entrega: boolean('entrega').notNull().default(false),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  autorId: uuid('autor_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

export const freelancers = pgTable('freelancers', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  profissao: text('profissao').notNull(),
  descricao: text('descricao').notNull().default(''),
  telefone: text('telefone').notNull().default(''),
  whatsapp: boolean('whatsapp').notNull().default(false),
  habilidades: jsonb('habilidades').$type<string[]>().notNull().default([]),
  disponibilidade: jsonb('disponibilidade').$type<string[]>().notNull().default([]),
  precoMin: doublePrecision('preco_min').notNull().default(0),
  precoMax: doublePrecision('preco_max').notNull().default(0),
  unidadePreco: text('unidade_preco').notNull().default('serviço'),
  atendeDomicilio: boolean('atende_domicilio').notNull().default(false),
  temTransporte: boolean('tem_transporte').notNull().default(false),
  bairro: text('bairro').notNull().default(''),
  autorId: uuid('autor_id').references(() => usuarios.id, { onDelete: 'set null' }),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
})

// ---------------------------------------------------------------------------
// Casas e famílias (dados sensíveis — acesso restrito a ADMIN)
// ---------------------------------------------------------------------------

export const casas = pgTable('casas', {
  id: uuid('id').primaryKey().defaultRandom(),
  apelido: text('apelido').notNull(),
  endereco: text('endereco').notNull().default(''),
  quadra: text('quadra').notNull().default(''),
  lote: text('lote').notNull().default(''),
  tipoConstrucao: text('tipo_construcao').notNull(),
  situacao: text('situacao').notNull(),
  comodos: integer('comodos').notNull().default(1),
  aguaEncanada: boolean('agua_encanada').notNull().default(false),
  esgoto: boolean('esgoto').notNull().default(false),
  energiaEletrica: boolean('energia_eletrica').notNull().default(false),
  coletaLixo: boolean('coleta_lixo').notNull().default(false),
  riscos: jsonb('riscos').$type<string[]>().notNull().default([]),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  observacoes: text('observacoes').notNull().default(''),
  criadaEm: timestamp('criada_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: atualizadoEm(),
})

export const familias = pgTable(
  'familias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nomeFamilia: text('nome_familia').notNull(),
    casaId: uuid('casa_id').references(() => casas.id, { onDelete: 'set null' }),
    responsavel: text('responsavel').notNull(),
    telefone: text('telefone').notNull().default(''),
    nis: text('nis').notNull().default(''),
    rendaMensal: doublePrecision('renda_mensal').notNull().default(0),
    beneficios: jsonb('beneficios').$type<string[]>().notNull().default([]),
    membros: jsonb('membros').$type<Membro[]>().notNull().default([]),
    observacoes: text('observacoes').notNull().default(''),
    criadaEm: timestamp('criada_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [index('familias_casa_idx').on(t.casaId)],
)

// ---------------------------------------------------------------------------
// Auditoria — quem fez o quê (exigência prática da LGPD para dados sociais)
// ---------------------------------------------------------------------------

export const auditoria = pgTable('auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  acao: text('acao').notNull(),
  entidade: text('entidade').notNull(),
  entidadeId: text('entidade_id'),
  detalhes: jsonb('detalhes').$type<Record<string, unknown>>(),
  criadoEm: criadoEm(),
})
