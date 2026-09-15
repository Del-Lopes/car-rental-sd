-- Carental :: Row Level Security
-- Regra geral: o banco e a fronteira de seguranca. A UI esconde, a RLS impede.
-- Todo acesso passa por aqui, inclusive chamadas diretas a API REST do Supabase.

alter table public.vehicle_categories      enable row level security;
alter table public.vehicle_document_types  enable row level security;
alter table public.customer_document_types enable row level security;
alter table public.profiles                enable row level security;
alter table public.vehicles                enable row level security;
alter table public.vehicle_photos          enable row level security;
alter table public.vehicle_documents       enable row level security;
alter table public.customer_documents      enable row level security;

-- Garantias explicitas (nao dependemos so do default privilege do Supabase).
grant usage on schema public to anon, authenticated;
grant select on public.vehicle_categories, public.vehicle_document_types,
  public.vehicle_photos
  to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.vehicles,
  public.vehicle_photos, public.vehicle_documents, public.customer_documents,
  public.vehicle_categories, public.vehicle_document_types,
  public.customer_document_types
  to authenticated;

-- Placa e chassi sao dados internos. A RLS filtra LINHAS, nao COLUNAS -- entao
-- o visitante anonimo recebe permissao apenas nas colunas da vitrine. Qualquer
-- `select *` feito como anon passa a falhar, o que e proposital: a consulta do
-- feed lista as colunas explicitamente (ver PUBLIC_VEHICLE_COLUMNS no app).
revoke select on public.vehicles from anon;
grant select (
  id, make, model, year, category_slug, transmission, fuel, seats, doors,
  color, mileage, weekly_rate, monthly_rate, security_deposit, status,
  description, featured, created_at, updated_at
) on public.vehicles to anon;

-- Nota: o papel `authenticated` mantem select em todas as colunas, porque admin
-- e cliente compartilham esse papel e o CRUD do admin precisa de RETURNING.
-- Ou seja, um cliente logado consegue ler placa/chassi chamando a API direto.
-- Risco aceito nesta fase; se o cliente exigir, a saida e mover a leitura da
-- vitrine para uma view e restringir a tabela ao admin.

-- --------------------------------------------------------------------- lookups
-- Leitura publica (o filtro do feed precisa das categorias). Escrita so admin.

create policy "lookups: leitura publica"
  on public.vehicle_categories for select
  to anon, authenticated using (true);

create policy "lookups: admin gerencia"
  on public.vehicle_categories for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "tipos de doc de veiculo: leitura publica"
  on public.vehicle_document_types for select
  to anon, authenticated using (true);

create policy "tipos de doc de veiculo: admin gerencia"
  on public.vehicle_document_types for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "tipos de doc de cliente: leitura autenticada"
  on public.customer_document_types for select
  to authenticated using (true);

create policy "tipos de doc de cliente: admin gerencia"
  on public.customer_document_types for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------------- profiles

create policy "profiles: le o proprio ou admin le todos"
  on public.profiles for select
  to authenticated using (id = auth.uid() or public.is_admin());

-- A troca de role e barrada pelo trigger profiles_lock_role, nao pela policy.
create policy "profiles: edita o proprio ou admin edita todos"
  on public.profiles for update
  to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles: admin remove"
  on public.profiles for delete
  to authenticated using (public.is_admin());

-- -------------------------------------------------------------------- vehicles
-- Vitrine publica: qualquer visitante le veiculos nao arquivados.

create policy "veiculos: vitrine publica"
  on public.vehicles for select
  to anon, authenticated using (status <> 'archived' or public.is_admin());

create policy "veiculos: admin gerencia"
  on public.vehicles for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "fotos: seguem a visibilidade do veiculo"
  on public.vehicle_photos for select
  to anon, authenticated using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_photos.vehicle_id
        and (v.status <> 'archived' or public.is_admin())
    )
  );

create policy "fotos: admin gerencia"
  on public.vehicle_photos for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Documento de veiculo e dado interno: nunca aparece na vitrine.
create policy "docs do veiculo: apenas admin"
  on public.vehicle_documents for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- customer documents

create policy "docs do cliente: dono le o seu, admin le todos"
  on public.customer_documents for select
  to authenticated using (profile_id = auth.uid() or public.is_admin());

create policy "docs do cliente: dono envia o seu"
  on public.customer_documents for insert
  to authenticated with check (profile_id = auth.uid() or public.is_admin());

-- Só o admin altera (status, observacao). O cliente reenvia em vez de editar.
create policy "docs do cliente: admin revisa"
  on public.customer_documents for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- O cliente pode remover o proprio envio enquanto ainda estiver pendente.
create policy "docs do cliente: dono apaga pendente, admin apaga qualquer"
  on public.customer_documents for delete
  to authenticated using (
    (profile_id = auth.uid() and status = 'pending') or public.is_admin()
  );
