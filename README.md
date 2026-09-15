# Carental

Sistema de controle operacional e vitrine para locadora de veiculos.
Mercado EUA: interface em **EN-US**, precos em **USD**, datas **mm/dd/yyyy**.

Planejamento e escopo: [ROADMAP.md](ROADMAP.md) · Pendencias com o cliente: [PERGUNTAS-CLIENTE.md](PERGUNTAS-CLIENTE.md)

## Stack

| Camada | Tecnologia |
|---|---|
| App | Next.js 15 (App Router) + TypeScript + React 19 |
| UI | Tailwind CSS v4 + shadcn/ui |
| Banco / Auth / Arquivos | Supabase (Postgres + Auth + Storage) |
| Validacao | Zod + react-hook-form |
| Deploy | Vercel |

## Requisito: Node.js 22+

O `supabase-js` usa o WebSocket nativo do Node, que so existe a partir da versao
22. Em versoes anteriores o app nao consegue nem criar o client do Supabase e o
`npm run dev` quebra. A Vercel ja usa Node 22 (declarado em `engines`).

## Modo preview (sem banco)

Sem as variaveis do Supabase o app liga sozinho o **modo preview**: todas as telas
funcionam com dados de exemplo (`src/lib/preview-fixtures.ts`, espelho do seed),
qualquer login abre o painel como admin e nenhuma alteracao e gravada. Uma faixa
no topo deixa isso visivel. Assim que o `.env.local` e preenchido, o modo desliga.

```bash
npm run build && npm start   # ou npm run dev
```

Rotas para navegar no preview: `/` (vitrine), `/login`, `/register`,
`/dashboard` (vencimentos), `/dashboard/vehicles`, `/dashboard/customers`,
`/dashboard/documents` (area do cliente) e `/dashboard/account`.

## Setup

### 1. Criar o projeto no Supabase

Em [supabase.com](https://supabase.com/dashboard) crie um projeto e anote,
em *Project Settings > API*: a URL, a chave `anon` e a `service_role`.

### 2. Variaveis de ambiente

```bash
cp .env.example .env.local
```

Preencha as quatro variaveis. A `SUPABASE_SERVICE_ROLE_KEY` e secreta: ignora
toda a RLS e so e usada pelo script de criacao do admin.

### 3. Aplicar as migrations

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npm run db:push
```

Para carregar tambem os dados de exemplo (8 veiculos e vencimentos cobrindo
todas as faixas do semaforo), rode o conteudo de `supabase/seed.sql` no SQL
Editor do painel do Supabase.

> Com Docker instalado da para rodar tudo localmente: `npm run db:start` sobe o
> Postgres e `npm run db:reset` aplica migrations + seed de uma vez.

### 4. Criar o administrador

Nao existe caminho pela interface que promova alguem a admin -- o banco cria
todo cadastro como `customer` e bloqueia a auto-promocao. Use o script, passando
a senha por variavel de ambiente para ela nao ficar no historico do terminal:

```powershell
$env:ADMIN_PASSWORD = Read-Host 'Senha' -MaskInput
npm run create-admin -- admin@carental.com "Nome do Admin"
$env:ADMIN_PASSWORD = $null
```

O script confere o papel salvo no banco ao final e falha se a promocao nao
tiver sido aplicada. Precisa de `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`.

> Admin atual do projeto: carentaldev@gmail.com (Flavio Gongola).

### 5. Rodar

```bash
npm run dev
```

Confira a infraestrutura em <http://localhost:3000/api/health>: a rota lista
tabela por tabela se o app consegue ler o banco.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica as migrations no projeto linkado |
| `npm run db:reset` | Recria o banco local (migrations + seed) |
| `npm run db:types` | Regera `src/lib/types/database.ts` a partir do schema real |
| `npm run create-admin` | Cria/promove o usuario administrador |

## Estrutura

```
src/
  app/
    api/health/         diagnostico de infraestrutura
    auth/callback/      troca o code do e-mail por sessao
  lib/
    actions/            server actions (mutacoes)
    data/               consultas de leitura, por dominio
    supabase/           clients: browser, server, middleware, service role
    types/database.ts   tipos do banco (regerar com npm run db:types)
    validation/         schemas Zod
  middleware.ts         renova a sessao e protege /dashboard
supabase/
  migrations/           schema, RLS, storage, views
  seed.sql              lookups + dados de exemplo
scripts/create-admin.ts
```

## Banco de dados

Quatro migrations, nesta ordem:

1. **init_schema** -- tabelas, enums, indices e triggers
2. **rls_policies** -- Row Level Security e grants
3. **storage** -- buckets e policies de arquivo
4. **views** -- dashboard de vencimentos e resumos

### Decisoes que valem conhecer antes de mexer

**Categorias e tipos de documento sao dados, nao schema.** Vivem em tabelas de
lookup (`vehicle_categories`, `vehicle_document_types`,
`customer_document_types`) porque a lista definitiva ainda depende de resposta
do cliente. Quando ele responder, e um INSERT -- nao uma migration.

**Documento do locatario pertence ao perfil, nao a uma locacao.** Assim funciona
tanto se o upload acontecer no cadastro quanto so ao fechar a locacao, que e
justamente a pendencia em aberto com o cliente.

**A RLS e a fronteira de seguranca, nao a interface.** Toda tabela tem RLS
ligada e as server actions checam o papel antes de escrever -- duas barreiras
independentes. Placa e chassi ficam fora das colunas liberadas para visitantes
anonimos (grant por coluna, ja que RLS filtra linha e nao coluna).

**Admin nao se cria pela tela.** O trigger `handle_new_user` cria todo mundo
como `customer` e o `profiles_lock_role` reverte qualquer tentativa de mudar o
proprio papel.

### Buckets

| Bucket | Visibilidade | Caminho |
|---|---|---|
| `vehicle-photos` | publico | `vehicles/<vehicle_id>/...` |
| `vehicle-docs` | privado, so admin | `vehicles/<vehicle_id>/...` |
| `customer-docs` | privado, dono + admin | `<profile_id>/...` |

O primeiro segmento de `customer-docs` **precisa** ser o `profile_id`: a policy
autoriza por pasta. Monte os caminhos sempre pelos helpers de `src/lib/storage.ts`.
