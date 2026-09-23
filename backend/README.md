# Rede Comunidade — API

Backend do app **Rede Comunidade** (Expo). Node.js + TypeScript + Express 5,
PostgreSQL via Drizzle ORM, autenticação própria com JWT + refresh token.

- **Desenvolvimento/testes:** sem instalar nada — usa [PGlite](https://pglite.dev)
  (o próprio Postgres rodando em WebAssembly dentro do Node), salvo em `./.pglite`.
- **Produção:** qualquer PostgreSQL (Neon, Supabase, Render, Railway…) via `DATABASE_URL`.

## Rodando localmente

```bash
cd backend
npm install
cp .env.example .env        # ajuste JWT_SECRET, ADMIN_EMAIL, ADMIN_CPF, ADMIN_SENHA
npm run db:seed             # cria o admin inicial (Presidente)
npm run dev                 # http://localhost:3333  (recarrega ao salvar)
```

No app (`mobile/`), rode `npx expo start` normalmente. Em desenvolvimento o app
descobre sozinho o IP da máquina (o mesmo que o Expo usa) e chama `http://<ip>:3333`.
Para apontar para outro servidor, crie `mobile/.env` com:

```
EXPO_PUBLIC_API_URL=https://sua-api.onrender.com
```

> **Celular físico + Expo Go:** o celular e o PC precisam estar na mesma rede
> Wi-Fi, e o Firewall do Windows precisa liberar a porta 3333 para o Node
> (na primeira execução ele pergunta — marque "Redes privadas").

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API com hot-reload |
| `npm test` | Roda a suíte de testes (banco em memória) |
| `npm run test:watch` | Testes em modo observação |
| `npm run typecheck` | Checagem de tipos |
| `npm run build` / `npm start` | Compila para `dist/` e roda a versão compilada |
| `npm run db:generate` | Gera migração SQL após alterar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica migrações (o servidor também aplica ao iniciar) |
| `npm run db:seed` | Cria/atualiza o admin a partir do `.env` |

## Estrutura

```
src/
  config/env.ts          variáveis de ambiente validadas (zod)
  db/schema.ts           tabelas (Drizzle)            drizzle/  migrações SQL geradas
  db/client.ts           conexão Postgres ou PGlite
  lib/                   regras puras: documentos (CPF/CNPJ/NIS), geo, vulnerabilidade, segurança
  middlewares/http.ts    autenticação, permissão, validação, tratamento de erros
  modules/               rotas HTTP por domínio (auth, usuarios, mapa, guia, social, admin)
test/                    testes de integração (supertest) e unitários (vitest)
```

## Endpoints

Todas as rotas, exceto `/auth/*` públicas e `/health`, exigem
`Authorization: Bearer <accessToken>`. Erros sempre voltam como
`{ "erro": "mensagem legível", "codigo": "CODIGO" }`.

| Método | Caminho | Quem | Descrição |
|---|---|---|---|
| POST | `/auth/registrar` | público | Cadastro (nasce PENDENTE) |
| POST | `/auth/login` | público | `{ identificador (CPF ou e-mail), senha }` → tokens |
| POST | `/auth/refresh` | público | Troca refresh token por um novo par |
| POST | `/auth/logout` | público | Revoga o refresh token |
| POST | `/auth/esqueci-senha` | público | Envia link/código por e-mail |
| POST | `/auth/redefinir-senha` | público | `{ token, novaSenha }` |
| GET/PATCH | `/auth/me` | logado | Ver/editar nome, telefone, rua |
| POST | `/auth/trocar-senha` | logado | `{ senhaAtual, novaSenha }` |
| GET | `/usuarios?status=&perfil=&busca=` | admin | Lista moradores |
| POST | `/usuarios/:id/aprovar` · `/recusar` | admin | Aprova/recusa (`{ motivo }`) |
| PATCH | `/usuarios/:id/perfil` | admin | Promove/rebaixa |
| GET/POST | `/rotas` | logado | Lista (`?tipo=&status=`) / cria |
| GET/PATCH/DELETE | `/rotas/:id` | autor ou admin | |
| POST/DELETE | `/rotas/:id/confirmacao` | logado | Confirma / desfaz confirmação |
| PATCH | `/rotas/:id/status` | admin | Validar/recusar manualmente |
| GET/POST | `/alertas` | logado | Lista (`?tipo=&resolvido=`) / cria |
| PATCH/DELETE | `/alertas/:id` | autor ou admin | |
| POST | `/alertas/:id/resolver` | autor ou admin | `{ resolvido: true/false }` |
| POST/DELETE | `/alertas/:id/confirmacao` | logado | |
| GET/POST | `/comercios` | logado | `?categoria=&busca=&entrega=true&aceitaFiado=true` |
| PATCH/DELETE | `/comercios/:id` | autor ou admin | |
| GET/POST | `/freelancers` | logado | `?busca=&habilidade=&disponibilidade=&precoAte=` |
| PATCH/DELETE | `/freelancers/:id` | autor ou admin | |
| GET/POST, PATCH/DELETE `:id` | `/casas` | admin | |
| GET/POST, GET/PATCH/DELETE `:id` | `/familias` | admin | `?ordenar=vulnerabilidade&faixa=Crítica` |
| GET | `/painel` | logado | Indicadores (sociais só para admin) |
| GET | `/admin/exportar` · POST `/admin/importar` | admin | Backup JSON |
| POST | `/admin/demo` | admin | Carrega dados de demonstração |
| DELETE | `/admin/dados` | admin | `{ confirmacao: "APAGAR TUDO" }` |
| GET | `/admin/auditoria` | admin | Últimas ações registradas |

## Regras de negócio

**Cadastro e acesso**
- CPF validado pelos dígitos verificadores; CPF e e-mail únicos.
- Todo cadastro nasce `PENDENTE`/`MORADOR`, mesmo que o cliente mande outra coisa.
- Pendente ou recusado não faz login (o motivo da recusa aparece na mensagem).
- Recusar um morador derruba as sessões dele **na hora** (o usuário é
  conferido no banco a cada requisição).
- A comunidade nunca fica sem administrador; admin não recusa a si mesmo.
- Login com mensagem única para "não existe" e "senha errada" (não revela quem tem conta).
- Access token de 15 min + refresh token de 30 dias com **rotação**; reapresentar
  um refresh já usado (sinal de roubo) revoga todas as sessões do usuário.
- Limite de 20 tentativas / 15 min por IP em login, cadastro e recuperação de senha.

**Mapa colaborativo**
- Autor vem sempre do token, nunca do corpo da requisição.
- Rota nasce `pendente`; com **3 confirmações** de outros moradores vira
  `validada` (configurável em `LIMIAR_VALIDACAO_ROTA`) e volta a `pendente` se
  cair abaixo. Ninguém confirma a própria contribuição.
- Mudar o traçado de uma rota zera as confirmações (a vizinhança precisa revalidar).
- Rota `recusada` pela diretoria não é revalidada por confirmações.
- Alerta do mesmo tipo a menos de **30 m** de outro aberto é recusado (409) com o
  id do existente — o morador deve confirmar o que já existe.
- Alerta resolvido não recebe confirmações; lista ordenada por prioridade
  (gravidade × confirmações).

**Comércios e freelancers**
- Comércio formalizado exige CNPJ/MEI válido.
- Preço mínimo ≤ máximo; busca por habilidade, turno e preço.

**Casas e famílias (LGPD)**
- Acesso restrito à diretoria; criação, alteração, exclusão e visualização
  individual ficam registradas na auditoria.
- Índice de vulnerabilidade calculado **no servidor** (mesma fórmula do app).
- Uma família tem no máximo um "Responsável"; NIS validado; "Nenhum" benefício
  não combina com outros.
- Excluir a casa mantém as famílias, só desfaz o vínculo.
- Casa sinalizada como superlotada com mais de 2 moradores por cômodo (critério IBGE).

## Testes

```bash
npm test
```

São 37 testes (unitários + integração HTTP). Cada arquivo sobe um Postgres
em memória próprio, então rodam isolados, sem Docker e sem tocar no seu banco.

**Dicas**
- **O que testar primeiro:** regras de negócio e permissões, não o framework.
  Veja `test/mapa.test.ts`: cada regra da lista acima tem um teste.
- **Teste o caminho triste:** para cada endpoint, um caso "quem não pode" (403),
  "dado inválido" (400/422) e "não existe" (404).
- **Confira que o teste falha:** ao escrever um teste novo, quebre a regra de
  propósito e veja ficar vermelho (ex.: `LIMIAR_VALIDACAO_ROTA=5 npm test`
  faz 2 testes falharem).
- **Testes manuais:** use o arquivo `requests.http` com a extensão
  *REST Client* do VS Code (ou importe no Insomnia/Postman).
- **CI:** `.github/workflows/backend.yml` roda typecheck, testes e build a cada push.
- **No app:** teste com duas contas em dois aparelhos (ou Expo Go + web) para
  ver confirmações, validação de rotas e aprovações acontecendo de verdade.

## Colocando no ar

### Opção 1 — Render (mais simples, tem plano gratuito)

O banco fica no **Neon** (PostgreSQL gratuito, sem expiração); o Render roda só a API.

1. No Neon, crie o projeto na região **AWS US East (N. Virginia)** e copie a
   connection string (mantenha `?sslmode=require`, remova `&channel_binding=require`).
2. Crie tabelas e admin a partir do seu PC: coloque a string em `DATABASE_URL`
   no `.env` e rode `npm run db:seed` (usa `ADMIN_*` do `.env`).
3. No [Render](https://render.com): **New → Blueprint** e escolha o repositório.
   O `render.yaml` (na raiz do repositório) cria a API na Virgínia e gera o `JWT_SECRET`; cole a
   `DATABASE_URL` do Neon quando pedir.
4. Teste `https://<seu-servico>.onrender.com/health`.
5. No app, `mobile/.env`: `EXPO_PUBLIC_API_URL=https://<seu-servico>.onrender.com`.

As migrações rodam sozinhas a cada deploy (o servidor aplica ao iniciar).

> O plano gratuito do Render "dorme" após 15 min sem uso (a primeira
> requisição demora ~50 s). Para uso diário, o plano Starter (~US$ 7/mês)
> mantém a API sempre ligada.

### Opção 2 — Docker (qualquer VPS, Railway, Fly.io)

```bash
docker build -t rede-comunidade-api .
docker run -p 3333:3333 --env-file .env rede-comunidade-api
```

### Checklist de produção
- `JWT_SECRET` longo e aleatório (nunca o do exemplo).
- `DATABASE_URL` com `?sslmode=require` em bancos na nuvem.
- Configure SMTP (ex.: Brevo, Resend, Gmail com senha de app) para a recuperação de senha.
- Ative backups automáticos do banco (Neon/Supabase/Render têm).
- Troque a senha do admin após o primeiro login.
- HTTPS é obrigatório (Render/Railway/Fly já entregam).

### Publicando o app
Com a API no ar, gere o app com o EAS:

```bash
cd mobile
npm i -g eas-cli && eas login
eas build:configure
eas build -p android --profile preview   # gera um .apk para instalar direto
```

Defina `EXPO_PUBLIC_API_URL` no `eas.json` (campo `env` do perfil) ou em
**EAS → Environment variables** para que o build aponte para a API de produção.
