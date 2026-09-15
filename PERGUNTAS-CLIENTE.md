# Carental — Confirmações com o cliente

Cada item traz **o que perguntar**, **por que importa** e o **default** que seguimos caso ele não responda a tempo. Nenhuma pendência deve parar o Sprint 0.

---

## Bloco A — Trava o desenvolvimento (precisa até o fim da semana 1)

### A1. Documentos do veículo com data de vencimento

**Perguntar:** quais documentos de cada carro ele precisa acompanhar vencimento?
**Por quê:** é o coração do dashboard do admin — define os tipos fixos do cadastro.
**Default:** registration, insurance, inspection + campo livre "outro".

### A2. Documentos exigidos do locatário

**Perguntar:** o que o locatário precisa enviar, e quais são obrigatórios?
**Por quê:** define a checklist da área do cliente e o que o admin revisa.
**Default:** driver's license (frente e verso) + proof of address, ambos obrigatórios.

### A3. Momento do upload dos documentos do locatário

**Perguntar:** o cliente envia os documentos logo no cadastro, ou só quando vai fechar a locação?
**Por quê:** muda o texto e o passo a passo da tela (o banco já suporta os dois).
**Default:** no cadastro, com aviso de que a locação só é liberada após aprovação.

### A4. Campos do veículo exibidos no site

**Perguntar:** confirmar a lista — make, model, year, categoria, transmissão, lugares, combustível, milhagem, cor, daily rate. Falta algo?
**Por quê:** define o formulário de cadastro e o card público.
**Default:** a lista acima.

### A5. Categorias de veículo

**Perguntar:** quais categorias ele usa? (a referência usa Luxury / SUV / Midsize)
**Por quê:** vira o filtro do feed público.
**Default:** Luxury, SUV, Midsize, Economy.

### A6. Estrutura de preço

**Perguntar:** mostra só a diária, ou também semanal/mensal? Tem depósito/caução ou limite de milhagem que precise aparecer?
**Por quê:** um preço só é bem mais simples; três exigem mais espaço no card e no cadastro.
**Default:** apenas daily rate em USD.

---

## Bloco B — Alinhamento de expectativa (confirmar antes de assinar/começar)

### B1. Escopo desta primeira versão

**Confirmar explicitamente:** nesta versão o site é **catálogo + controle interno**. Não tem reserva online, não tem pagamento, não tem botão de WhatsApp. Isso é proposital para caber no budget; entram como expansão depois.
**Por quê:** é a fonte número 1 de atrito na entrega. Melhor deixar escrito agora.

### B2. Quem usa o painel

**Perguntar:** só ele acessa o painel, ou mais gente da equipe?
**Por quê:** Fase 1 prevê um único login de admin. Vários usuários com permissões é expansão.
**Default:** um admin.

### B3. Dados que já existem hoje

**Perguntar:** ele já tem planilha ou sistema com os carros e os clientes? Se sim, pedir uma cópia.
**Por quê:** dá para importar de uma vez e o sistema já nasce populado — evita ele ter que digitar tudo.

---

## Bloco C — Conteúdo e infra (pode chegar até a semana 3)

### C1. Identidade visual

**Perguntar:** já existe logo e cores do Carental?
**Default:** se não houver, seguimos a linha visual da referência (escuro, Inter, minimalista) e a marca pode ser trocada depois.

### C2. Fotos dos veículos

**Perguntar:** enviar fotos reais de cada carro (idealmente 4–6 por veículo, horizontais).
**Por quê:** é o que mais pesa na percepção de qualidade do feed. Até chegarem, usamos placeholders.

### C3. Textos e contato

**Perguntar:** texto do "About", telefone, e-mail, endereço/cidade e Instagram que devem aparecer no site.

### C4. Domínio

**Perguntar:** já tem domínio comprado? Quem controla o registrador?
**Por quê:** precisamos de acesso ao DNS para o go-live.

### C5. Privacidade e termos

**Perguntar:** ele tem política de privacidade e termos de uso?
**Por quê:** o sistema vai guardar driver's license e comprovante de endereço — nos EUA isso normalmente exige aviso de privacidade publicado. Precisa estar resolvido antes do go-live.

---

## Status

| # | Item | Respondido | Resposta |
|---|---|---|---|
| A1 | Documentos do veículo | [x] | Só **registration**, alerta no dashboard, vencimento em **mês/ano** |
| A2 | Documentos do locatário | [x] | CNH frente + verso e comprovante de endereço (os 3 obrigatórios) |
| A3 | Momento do upload | [x] | **No cadastro** do locatário |
| A4 | Campos do veículo | [x] | Lista confirmada, sem adição nem remoção |
| A5 | Categorias | [x] | Sedan, Hatchback, Wagon, SUV, Coupe, Convertible, Minivan, Pickup Truck, Van |
| A6 | Estrutura de preço | [x] | **Semanal e mensal** (sem diária), **com caução**, **sem limite de milhagem** |
| B1 | Escopo confirmado | [ ] | |
| B2 | Usuários do painel | [ ] | |
| B3 | Dados existentes | [ ] | |
| C1 | Identidade visual | [ ] | |
| C2 | Fotos | [ ] | |
| C3 | Textos e contato | [ ] | |
| C4 | Domínio | [ ] | |
| C5 | Privacidade/termos | [ ] | Cliente vai validar com a Kira antes do go-live |

Respostas recebidas em 10/09/2026 e já refletidas no schema, no seed e na camada
de validação. O Bloco A está fechado: nada mais trava o desenvolvimento.
