CREATE TABLE "alertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"gravidade" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"resolvido" boolean DEFAULT false NOT NULL,
	"resolvido_em" timestamp with time zone,
	"resolvido_por" uuid,
	"autor_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" text,
	"detalhes" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apelido" text NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"quadra" text DEFAULT '' NOT NULL,
	"lote" text DEFAULT '' NOT NULL,
	"tipo_construcao" text NOT NULL,
	"situacao" text NOT NULL,
	"comodos" integer DEFAULT 1 NOT NULL,
	"agua_encanada" boolean DEFAULT false NOT NULL,
	"esgoto" boolean DEFAULT false NOT NULL,
	"energia_eletrica" boolean DEFAULT false NOT NULL,
	"coleta_lixo" boolean DEFAULT false NOT NULL,
	"riscos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"observacoes" text DEFAULT '' NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comercios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"responsavel" text DEFAULT '' NOT NULL,
	"categoria" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"whatsapp" boolean DEFAULT false NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"horario" text DEFAULT '' NOT NULL,
	"formalizado" boolean DEFAULT false NOT NULL,
	"cnpj_mei" text DEFAULT '' NOT NULL,
	"aceita_fiado" boolean DEFAULT false NOT NULL,
	"entrega" boolean DEFAULT false NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"autor_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmacoes" (
	"alvo_tipo" text NOT NULL,
	"alvo_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confirmacoes_alvo_tipo_alvo_id_usuario_id_pk" PRIMARY KEY("alvo_tipo","alvo_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "familias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_familia" text NOT NULL,
	"casa_id" uuid,
	"responsavel" text NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"nis" text DEFAULT '' NOT NULL,
	"renda_mensal" double precision DEFAULT 0 NOT NULL,
	"beneficios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"membros" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "freelancers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"profissao" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"whatsapp" boolean DEFAULT false NOT NULL,
	"habilidades" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"disponibilidade" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preco_min" double precision DEFAULT 0 NOT NULL,
	"preco_max" double precision DEFAULT 0 NOT NULL,
	"unidade_preco" text DEFAULT 'serviço' NOT NULL,
	"atende_domicilio" boolean DEFAULT false NOT NULL,
	"tem_transporte" boolean DEFAULT false NOT NULL,
	"bairro" text DEFAULT '' NOT NULL,
	"autor_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"revogado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "resets_senha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resets_senha_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "rotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"condicao" text NOT NULL,
	"iluminacao" boolean DEFAULT false NOT NULL,
	"acessivel" boolean DEFAULT false NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"pontos" jsonb NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"autor_id" uuid,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"cpf" text NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"rua" text DEFAULT '' NOT NULL,
	"senha_hash" text NOT NULL,
	"perfil" text DEFAULT 'MORADOR' NOT NULL,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"composicao_familiar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"motivo_recusa" text,
	"avaliado_por" uuid,
	"avaliado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_resolvido_por_usuarios_id_fk" FOREIGN KEY ("resolvido_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comercios" ADD CONSTRAINT "comercios_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmacoes" ADD CONSTRAINT "confirmacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "familias" ADD CONSTRAINT "familias_casa_id_casas_id_fk" FOREIGN KEY ("casa_id") REFERENCES "public"."casas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelancers" ADD CONSTRAINT "freelancers_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resets_senha" ADD CONSTRAINT "resets_senha_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alertas_abertos_idx" ON "alertas" USING btree ("resolvido","tipo");--> statement-breakpoint
CREATE INDEX "familias_casa_idx" ON "familias" USING btree ("casa_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_usuario_idx" ON "refresh_tokens" USING btree ("usuario_id");