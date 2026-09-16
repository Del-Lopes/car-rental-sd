# Carental — Roadmap do MVP (Kickstart)

**Cliente:** operação de aluguel de carros (EUA)
**Referência visual/funcional:** https://saharacars.us/ (SPA React/Vite, Tailwind, Inter, dark mode, categorias Luxury / SUV / Midsize)
**Idioma do produto:** EN-US · **Moeda:** USD · **Datas:** mm/dd/yyyy
**Objetivo:** entregar um sistema enxuto de controle operacional + vitrine pública, dentro de budget de kickstart, com arquitetura preparada para as expansões pagas da Fase 2.

---

## 0. Andamento (16/09/2026)

Os Sprints 0 a 4 estão entregues e rodando com banco real. O Sprint 5 (QA) está em andamento.

| Sprint | Status | Observação |
|---|---|---|
| 0 — Fundação | ✅ Entregue | Migrations aplicadas no Supabase; 36 testes de schema e RLS passando |
| 1 — Vitrine pública | ✅ Entregue | Home, filtros, detalhe, SEO, sitemap, tema claro/escuro, identidade do logo |
| 2 — Auth + Veículos | ✅ Entregue | Cadastro em 2 etapas, CRUD, fotos, registration mês/ano. Testado em produção |
| 3 — Dashboard + Clientes | ✅ Entregue | Vencimentos com semáforo, lista de clientes, revisão de documentos |
| 4 — Área do cliente | ✅ Entregue | Upload, status, reenvio após recusa, perfil e senha |
| 5 — QA e handoff | 🔄 Em andamento | Roteiro de testes em execução pelo cliente |
| **Extra — Locações e cobranças** | ✅ Código pronto | Controle manual de aluguéis com vencimento de parcela no dashboard. **Falta aplicar a migration no banco** |

### Módulo de locações (fora do escopo original da Fase 1)

Lançamento manual, sem gateway de pagamento. O dono registra que alugou um carro e quando vence a próxima parcela; o dashboard passa a mostrar as cobranças atrasadas e a vencer nos próximos 7 dias.

- Locatário pode ser um cliente cadastrado ou apenas um nome digitado
- Planos semanal e mensal; o botão "Received" registra o recebimento e empurra o vencimento sozinho (7 dias ou 1 mês)
- Histórico de recebimentos por locação — base para o relatório de receita da Fase 2
- Abrir a locação marca o carro como alugado e o tira da vitrine; encerrar devolve — feito por trigger no banco
- Um carro não aceita duas locações ativas ao mesmo tempo

**Infra ativa:** GitHub `carentaldev-stack/Cartental` · Supabase `izdbkfxjtqmqfrkauvtb` · Vercel em **https://carentalsd.vercel.app**.
Admin: carentaldev@gmail.com (Flavio Gongola).

**Validado em produção:** cadastro de veículo com 2 fotos (upload OK), fotos do Storage renderizando na vitrine, página de detalhe com preços e caução, criação de conta de cliente pelo site (2 contas), login do admin.

**Ainda não exercitado nos testes:** registration de veículo (0 registros) e upload de documento do locatário (0 registros) — são justamente os dois fluxos centrais do controle operacional.

### Riscos e pendências abertas

| Item | Situação |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Ainda não aplicada** (o sitemap sai com localhost). Na Vercel, criar como tipo "Config" com `https://carentalsd.vercel.app` e redeploy |
| URLs do Supabase Auth | Foram configuradas com o domínio antigo; precisam apontar para carentalsd.vercel.app |
| Upload > 4,5 MB | Limite da Vercel para Server Actions, abaixo dos 10 MB anunciados. Correção: upload direto ao Storage |
| E-mail transacional | SMTP padrão do Supabase tem limite baixo; produção pede SMTP próprio |
| Cliente | Fotos reais, textos e contato, domínio próprio, política de privacidade (Kira) |

---

## 1. Decisões de arquitetura

| Item | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | SSR para SEO da vitrine + rotas protegidas no mesmo projeto |
| UI | **Tailwind CSS + shadcn/ui** | Velocidade de construção, dark mode nativo, visual próximo da referência |
| Banco / Auth / Arquivos | **Supabase** (Postgres + Auth + Storage) | Auth, RLS e upload de documentos prontos — corta semanas de trabalho |
| Deploy | **Vercel** (app) + Supabase gerenciado | Deploy contínuo por git push, preview por branch |
| Forms / validação | react-hook-form + zod | Padrão de mercado, tipado ponta a ponta |

### Custo mensal de infra (fase inicial)

- Vercel Hobby: **US$ 0** (Pro US$ 20/mês quando houver domínio comercial + analytics)
- Supabase Free: **US$ 0** até 500 MB de banco e 1 GB de storage → **US$ 25/mês** no Pro (recomendado assim que entrar em produção, pelo backup diário)
- Domínio: ~US$ 12–15/ano

**Total realista em produção: US$ 25–45/mês.**

---

## 2. Escopo da Fase 1 (o que entra)

### 2.1 Vitrine pública (sem login)

- Home com hero, destaques e grade de veículos disponíveis
- Card do veículo: foto de capa, make/model/year, categoria, transmissão, lugares, **weekly rate (USD)**, badge de status
- Página de detalhe mostra também o **monthly rate** e a **caução (security deposit)**. Não há diária nem limite de milhagem — decisão do cliente
- Página de detalhe: galeria de fotos, especificações completas, descrição
- Filtros simples: categoria, faixa de preço, transmissão + ordenação por preço
- **Sem reserva, sem checkout, sem WhatsApp** — decisão do cliente. O CTA leva à página de detalhe / contato estático. Reserva e pagamento são expansões cobradas à parte (ver seção 3).
- SEO básico: metadados, Open Graph, `sitemap.xml`, JSON-LD `CarRental` (igual à referência)

### 2.2 Autenticação e papéis

- Supabase Auth (e-mail + senha, recuperação de senha)
- Dois papéis: **admin** (operador da locadora) e **customer** (locatário)
- Rotas `/dashboard/*` protegidas por middleware; RLS no banco garante o isolamento mesmo se a API for chamada direto

### 2.3 Painel do administrador

**a) Dashboard inicial — vencimentos de documentos dos veículos**

- Cards-resumo: veículos totais, disponíveis, alugados, clientes cadastrados, documentos vencendo
- Tabela "Upcoming document expirations" agrupada por urgência: **vencido**, **≤ 15 dias**, **≤ 30 dias**, **≤ 60 dias**, com semáforo de cor
- Clique na linha leva ao veículo correspondente

**b) Veículos**

- CRUD completo: cadastrar, editar, arquivar
- Upload de múltiplas fotos (capa + galeria), com reordenação
- Status: `available` / `rented` / `maintenance`
- **Registration** com vencimento informado em **mês/ano** e anexo de arquivo (PDF/imagem). É o único documento acompanhado nesta fase; insurance e inspection já cabem no modelo e podem ser ligados depois sem alterar o banco

**c) Clientes**

- Lista de clientes cadastrados, com busca e status de documentação
- Detalhe do cliente: dados de contato + documentos enviados, com pré-visualização
- Ação de **aprovar / recusar** cada documento, com campo de observação

### 2.4 Área do cliente (logado)

- Perfil: dados de contato editáveis
- **Upload de documentos**: driver's license (frente/verso), proof of address, outros — com status `pending` / `approved` / `rejected` visível e motivo da recusa
- Lista do que já foi enviado e do que ainda falta

---

## 3. O que fica de fora da Fase 1 (backlog comercial)

Itens deliberadamente adiados, para serem orçados como expansões:

| Expansão | Descrição | Estimativa |
|---|---|---|
| Solicitação de reserva | Cliente escolhe datas, admin aprova/recusa, checagem de disponibilidade | 1–1,5 semana |
| Pagamento online | Stripe (sinal ou valor integral), recibos | 1,5–2 semanas |
| Integração WhatsApp | Botão flutuante, deep link com contexto do veículo, ou API oficial | 2 dias – 1 semana |
| Alertas automáticos de vencimento | E-mail/push X dias antes (cron + Resend) | 3 dias |
| Contratos digitais | Geração de PDF + assinatura eletrônica | 1–2 semanas |
| Relatórios e faturamento | Receita por veículo, taxa de ocupação, exportação CSV | 1 semana |
| Multiusuário / equipe | Vários operadores com permissões distintas | 4 dias |
| Manutenções e quilometragem | Histórico de revisões, custo por veículo | 1 semana |

> A modelagem da Fase 1 já deixa ganchos para todos esses itens — nenhum exige refazer o banco.

---

## 4. Modelo de dados (Fase 1)

```
profiles            id (= auth.users), role (admin|customer), full_name, email,
                    phone, created_at
vehicles            id, make, model, year, category_slug, transmission, seats,
                    fuel, doors, mileage, color, plate, vin, weekly_rate,
                    monthly_rate, security_deposit, status, description,
                    featured, created_at
vehicle_photos      id, vehicle_id, storage_path, sort_order, is_cover
vehicle_documents   id, vehicle_id, type_slug (registration), doc_number,
                    issued_at, expires_at, file_path, notes
customer_documents  id, profile_id, type_slug (dl_front|dl_back|proof_of_address),
                    file_path, status (pending|approved|rejected), expires_at,
                    reviewed_by, reviewed_at, notes
```

**Categorias e tipos de documento são tabelas de lookup**, não enums: `vehicle_categories`, `vehicle_document_types` e `customer_document_types`. Foi essa escolha que permitiu absorver as respostas do cliente (9 categorias por carroceria, só registration) sem uma migration nova.

**Vencimento em mês/ano:** a registration é informada como mês + ano e gravada como o **último dia daquele mês**, para que a contagem de dias do dashboard continue exata.

**Decisão importante:** os documentos do locatário ficam ancorados ao **perfil**, não a uma reserva. O cliente confirmou que o upload acontece **no momento do cadastro** — e como o modelo não depende de uma locação, exigir os documentos mais tarde continuaria funcionando sem mudança de banco.

**Storage (buckets):** `vehicle-photos` (público) · `vehicle-docs` (privado) · `customer-docs` (privado: cada cliente lê só o que é dele, admin lê tudo — via RLS + signed URLs).

**View auxiliar:** `v_expiring_vehicle_documents` — reúne os documentos de veículo que têm `expires_at`, calcula `days_to_expire` e classifica a urgência, alimentando o dashboard com uma query só.

---

## 5. Cronograma (≈ 4 a 5 semanas)

### Sprint 0 — Fundação (2–3 dias)

- Repositório + Next.js + TypeScript + Tailwind + shadcn/ui
- Projeto Supabase, migrations do schema acima, RLS e buckets
- Seed com 6–8 veículos fictícios
- Deploy na Vercel com preview por branch
- **Entrega:** ambiente de staging no ar, ainda sem telas

### Sprint 1 — Vitrine pública (semana 1)

- Layout base: header, footer, dark mode, tipografia
- Home + grade de veículos + filtros
- Página de detalhe com galeria
- SEO e responsividade
- **Entrega:** feed público navegável com dados reais de staging

### Sprint 2 — Auth + Veículos (semana 2)

- Login, cadastro, recuperação de senha, middleware de proteção
- Shell do `/dashboard` com navegação por papel
- CRUD de veículos + upload de fotos
- Cadastro de documentos do veículo com data de validade
- **Entrega:** admin já consegue popular o sistema sozinho

### Sprint 3 — Dashboard + Clientes (semana 3)

- Dashboard de vencimentos com semáforo e agrupamento por urgência
- Cards-resumo
- Lista de clientes + detalhe + revisão (aprovar/recusar) de documentos
- **Entrega:** controle operacional completo do lado do admin

### Sprint 4 — Área do cliente + Polimento (semana 4)

- Perfil do cliente e upload de documentos com status
- Estados vazios, loading, mensagens de erro, revisão mobile
- Domínio, produção, backup
- **Entrega:** MVP em produção

### Sprint 5 — QA e handoff (2–3 dias, buffer)

- Testes ponta a ponta dos fluxos críticos
- Manual de operação curto (como cadastrar carro, como revisar documento)
- Sessão de treinamento com o cliente
- **Entrega:** projeto entregue + backlog da Fase 2 orçado

---

## 6. Critérios de aceite do MVP

- [ ] Visitante não logado vê o feed e o detalhe dos veículos, no desktop e no celular
- [ ] Admin cadastra um veículo com fotos e datas de documentos em menos de 3 minutos
- [ ] Dashboard mostra corretamente todo documento que vence nos próximos 60 dias, ordenado por urgência
- [ ] Cliente se cadastra, envia documentos e vê o status de cada um
- [ ] Admin aprova/recusa documento e o cliente enxerga o motivo da recusa
- [ ] Cliente A não consegue acessar documento do cliente B (validado por chamada direta à API)
- [ ] Lighthouse ≥ 90 em performance e SEO na home

---

## 7. Pendências com o cliente

### Respondido (10/09/2026) — já aplicado no código

| # | Pergunta | Resposta |
|---|---|---|
| A1 | Documentos do veículo | Apenas **registration**, com alerta no dashboard e vencimento em **mês/ano** |
| A2 | Documentos do locatário | Driver's license **frente e verso** + **proof of address** |
| A3 | Momento do upload | **No cadastro** do locatário |
| A4 | Campos do veículo | Lista confirmada sem adições nem remoções |
| A5 | Categorias | Por carroceria: Sedan, Hatchback, Wagon, SUV + Coupe, Convertible, Minivan, Pickup Truck, Van |
| A6 | Preço | **Semanal e mensal** (sem diária), **com caução**, **sem limite de milhagem** |

### Ainda em aberto

1. **Identidade visual**: logo, paleta e fontes do Carental — até chegarem, seguimos a linha visual da referência
2. **Conteúdo**: fotos reais dos veículos, texto de "About" e dados de contato
3. **Domínio e e-mail** de produção
4. **Política de privacidade e termos de uso** — o sistema armazena driver's license e proof of address; nos EUA isso costuma exigir aviso de privacidade publicado. O cliente vai validar com a Kira antes do go-live
5. **Escopo da Fase 1** (sem reserva online, sem pagamento, sem WhatsApp) — confirmar por escrito
6. **Usuários do painel**: só o dono ou mais gente da equipe?
7. **Dados existentes**: se houver planilha de carros e clientes, importamos de uma vez

---

## 8. Próximo passo imediato

Aprovado o roadmap → executar o **Sprint 0** e subir o staging, para o cliente acompanhar o progresso desde a primeira semana.
