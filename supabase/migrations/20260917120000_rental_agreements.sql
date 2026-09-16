-- Carental :: termos da plataforma e contrato de locacao com aceite eletronico
--
-- Fluxo:
--   1. O admin publica os termos. Cada publicacao e uma VERSAO imutavel: editar
--      significa publicar a proxima. Quem assinou antes continua vinculado ao
--      texto que de fato leu.
--   2. O admin registra uma locacao para um cliente cadastrado -> um trigger
--      cria o contrato pendente.
--   3. O cliente assina no painel (checkbox + nome digitado). A funcao de
--      assinatura grava versao dos termos, dados do aluguel congelados, nome,
--      data/hora, IP e navegador.
--   4. Contrato assinado nao muda mais -- nem pelo admin, nem pelo service_role.
--
-- Migration segura para rodar mais de uma vez.

-- ------------------------------------------------------------ termos (versoes)

create table if not exists public.terms_versions (
  id         uuid primary key default gen_random_uuid(),
  version    integer not null unique,
  body       text not null check (length(btrim(body)) > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Numero da versao e autor definidos pelo banco, nunca pelo formulario.
create or replace function public.assign_terms_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  select coalesce(max(version), 0) + 1 into new.version from public.terms_versions;
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists terms_versions_assign on public.terms_versions;
create trigger terms_versions_assign
  before insert on public.terms_versions
  for each row execute function public.assign_terms_version();

-- Imutabilidade: vale inclusive para o service_role, que ignora RLS mas nao triggers.
create or replace function public.block_terms_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Published terms cannot be changed. Publish a new version instead.'
    using errcode = '42501';
end;
$$;

drop trigger if exists terms_versions_immutable on public.terms_versions;
create trigger terms_versions_immutable
  before update or delete on public.terms_versions
  for each row execute function public.block_terms_changes();

create or replace view public.v_current_terms
with (security_invoker = true) as
select * from public.terms_versions
order by version desc
limit 1;

-- ------------------------------------------------------------------ contratos

do $$
begin
  create type public.agreement_status as enum ('pending', 'signed');
exception when duplicate_object then null;
end $$;

create table if not exists public.rental_agreements (
  id                uuid primary key default gen_random_uuid(),
  -- restrict: um contrato assinado e registro legal; a locacao nao pode sumir por baixo dele.
  rental_id         uuid not null unique references public.rentals(id) on delete restrict,
  customer_id       uuid references public.profiles(id) on delete set null,
  status            public.agreement_status not null default 'pending',
  terms_version_id  uuid references public.terms_versions(id),
  rental_snapshot   jsonb,
  signed_name       text,
  signed_at         timestamptz,
  signer_ip         text,
  signer_user_agent text,
  email_sent_at     timestamptz,
  created_at        timestamptz not null default now(),
  constraint rental_agreements_signed_complete check (
    status = 'pending'
    or (terms_version_id is not null and rental_snapshot is not null
        and signed_name is not null and signed_at is not null)
  )
);

create index if not exists rental_agreements_customer_idx
  on public.rental_agreements (customer_id, status);

-- Locacao para cliente cadastrado gera o contrato pendente. Locatario sem conta
-- (so nome digitado) nao tem como assinar online.
create or replace function public.create_rental_agreement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null then
    insert into public.rental_agreements (rental_id, customer_id)
    values (new.id, new.customer_id)
    on conflict (rental_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists rentals_create_agreement on public.rentals;
create trigger rentals_create_agreement
  after insert on public.rentals
  for each row execute function public.create_rental_agreement();

-- Depois de assinado, so o carimbo de envio do e-mail pode mudar.
create or replace function public.protect_signed_agreement()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'signed' then
      raise exception 'Signed agreements cannot be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.status = 'signed' and (
       new.status            is distinct from old.status
    or new.rental_id         is distinct from old.rental_id
    or new.customer_id       is distinct from old.customer_id
    or new.terms_version_id  is distinct from old.terms_version_id
    or new.rental_snapshot   is distinct from old.rental_snapshot
    or new.signed_name       is distinct from old.signed_name
    or new.signed_at         is distinct from old.signed_at
    or new.signer_ip         is distinct from old.signer_ip
    or new.signer_user_agent is distinct from old.signer_user_agent
  ) then
    raise exception 'Signed agreements cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists rental_agreements_protect on public.rental_agreements;
create trigger rental_agreements_protect
  before update or delete on public.rental_agreements
  for each row execute function public.protect_signed_agreement();

-- ------------------------------------------------------------------ assinatura
-- Executada so pelo servidor (service_role), depois de validar a sessao do
-- cliente: assim IP e navegador vem da requisicao real e nao de um valor que o
-- proprio cliente poderia forjar chamando a API direto.

create or replace function public.sign_rental_agreement(
  p_agreement_id     uuid,
  p_customer_id      uuid,
  p_terms_version_id uuid,
  p_signed_name      text,
  p_ip               text,
  p_user_agent       text
)
returns public.rental_agreements
language plpgsql
security definer
set search_path = public
as $$
declare
  agreement       public.rental_agreements;
  current_terms   uuid;
  profile_name    text;
  rental_is_open  boolean;
  snapshot        jsonb;
begin
  select * into agreement from public.rental_agreements where id = p_agreement_id for update;
  if not found or agreement.customer_id is distinct from p_customer_id then
    raise exception 'Agreement not found' using errcode = 'P0002';
  end if;
  if agreement.status = 'signed' then
    raise exception 'This agreement is already signed' using errcode = 'P0001';
  end if;

  select status = 'active' into rental_is_open from public.rentals where id = agreement.rental_id;
  if not coalesce(rental_is_open, false) then
    raise exception 'This rental is no longer active' using errcode = 'P0001';
  end if;

  select id into current_terms from public.terms_versions order by version desc limit 1;
  if current_terms is null then
    raise exception 'Rental terms have not been published yet' using errcode = 'P0001';
  end if;
  -- Evita assinar um texto que o admin trocou enquanto o cliente lia.
  if p_terms_version_id is distinct from current_terms then
    raise exception 'The terms were updated while you were reading. Please review the latest version.'
      using errcode = 'P0001';
  end if;

  select full_name into profile_name from public.profiles where id = p_customer_id;
  if lower(regexp_replace(btrim(coalesce(p_signed_name, '')), '\s+', ' ', 'g'))
     <> lower(regexp_replace(btrim(coalesce(profile_name, '')), '\s+', ' ', 'g'))
     or btrim(coalesce(profile_name, '')) = '' then
    raise exception 'The typed name must match the full name on your account' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
           'vehicle', concat_ws(' ', v.year, v.make, v.model),
           'plate', v.plate,
           'plan', r.plan,
           'rate_amount', r.rate_amount,
           'deposit_amount', r.deposit_amount,
           'started_on', r.started_on,
           'next_due_on', r.next_due_on,
           'renter', profile_name
         )
    into snapshot
    from public.rentals r
    join public.vehicles v on v.id = r.vehicle_id
   where r.id = agreement.rental_id;

  update public.rental_agreements
     set status            = 'signed',
         terms_version_id  = current_terms,
         rental_snapshot   = snapshot,
         signed_name       = btrim(p_signed_name),
         signed_at         = now(),
         signer_ip         = left(p_ip, 64),
         signer_user_agent = left(p_user_agent, 512)
   where id = agreement.id
  returning * into agreement;

  return agreement;
end;
$$;

revoke all on function public.sign_rental_agreement(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.sign_rental_agreement(uuid, uuid, uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------- views

create or replace view public.v_rental_agreements
with (security_invoker = true) as
select
  a.id,
  a.rental_id,
  a.customer_id,
  a.status,
  a.signed_at,
  a.signed_name,
  a.signer_ip,
  a.email_sent_at,
  a.created_at,
  a.rental_snapshot,
  a.terms_version_id,
  t.version as terms_version,
  p.full_name as customer_name,
  p.email as customer_email,
  r.status as rental_status,
  r.plan,
  r.rate_amount,
  r.deposit_amount,
  r.started_on,
  r.vehicle_id,
  concat_ws(' ', v.year, v.make, v.model) as vehicle_label
from public.rental_agreements a
join public.rentals r on r.id = a.rental_id
join public.vehicles v on v.id = r.vehicle_id
left join public.profiles p on p.id = a.customer_id
left join public.terms_versions t on t.id = a.terms_version_id;

-- Contratos pendentes entram nos numeros do dashboard (coluna nova no fim).
create or replace view public.v_admin_dashboard_stats
with (security_invoker = true) as
select
  (select count(*) from public.vehicles where status <> 'archived')      as vehicles_total,
  (select count(*) from public.vehicles where status = 'available')      as vehicles_available,
  (select count(*) from public.vehicles where status = 'rented')         as vehicles_rented,
  (select count(*) from public.vehicles where status = 'maintenance')    as vehicles_maintenance,
  (select count(*) from public.profiles where role = 'customer')         as customers_total,
  (select count(*) from public.customer_documents where status = 'pending') as customer_docs_pending,
  (select count(*) from public.v_expiring_vehicle_documents
    where urgency = 'expired')                                          as vehicle_docs_expired,
  (select count(*) from public.v_expiring_vehicle_documents
    where urgency in ('critical', 'warning', 'upcoming'))               as vehicle_docs_expiring,
  (select count(*) from public.rentals where status = 'active')          as rentals_active,
  (select count(*) from public.v_rental_due where urgency = 'overdue')   as payments_overdue,
  (select count(*) from public.v_rental_due
    where urgency in ('due_today', 'soon', 'upcoming'))                 as payments_due_soon,
  (select count(*) from public.rental_agreements a
     join public.rentals r on r.id = a.rental_id
    where a.status = 'pending' and r.status = 'active')                 as agreements_pending;

-- ------------------------------------------------------------------------ RLS

alter table public.terms_versions enable row level security;
alter table public.rental_agreements enable row level security;

grant select on public.terms_versions, public.v_current_terms to anon, authenticated;
grant insert on public.terms_versions to authenticated;
grant select on public.rental_agreements, public.v_rental_agreements to authenticated;
grant all on public.terms_versions, public.rental_agreements to service_role;

-- Termos sao publicos: o locatario pode ler antes mesmo de criar conta.
drop policy if exists "termos: leitura publica" on public.terms_versions;
create policy "termos: leitura publica"
  on public.terms_versions for select
  to anon, authenticated using (true);

drop policy if exists "termos: admin publica" on public.terms_versions;
create policy "termos: admin publica"
  on public.terms_versions for insert
  to authenticated with check (public.is_admin());

-- Contratos: so leitura pela API. Criacao via trigger, assinatura via funcao do
-- servidor. Nem o admin grava direto -- e isso que torna a assinatura confiavel.
drop policy if exists "contratos: cliente le os seus, admin le todos" on public.rental_agreements;
create policy "contratos: cliente le os seus, admin le todos"
  on public.rental_agreements for select
  to authenticated using (customer_id = auth.uid() or public.is_admin());
