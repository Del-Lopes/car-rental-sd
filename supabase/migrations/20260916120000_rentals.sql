-- Carental :: locacoes e cobrancas (controle manual)
--
-- Nao ha gateway de pagamento nesta fase: o proprio dono registra que alugou um
-- carro e quando vence a proxima parcela. O dashboard passa a mostrar, alem dos
-- vencimentos de registration, as cobrancas a vencer e as atrasadas.
--
-- O locatario pode ser um cliente cadastrado (customer_id) ou apenas um nome
-- digitado (renter_name) -- nem todo locatario tera conta no comeco.

do $$
begin
  create type public.rental_plan as enum ('weekly', 'monthly');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.rental_status as enum ('active', 'closed');
exception when duplicate_object then null;
end $$;

create table if not exists public.rentals (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references public.vehicles(id) on delete restrict,
  customer_id    uuid references public.profiles(id) on delete set null,
  renter_name    text,
  plan           public.rental_plan not null,
  rate_amount    numeric(10, 2) not null check (rate_amount >= 0),
  deposit_amount numeric(10, 2) check (deposit_amount >= 0),
  started_on     date not null default current_date,
  next_due_on    date not null,
  ended_on       date,
  status         public.rental_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Sempre da para saber quem esta com o carro.
  constraint rentals_renter_check
    check (customer_id is not null or nullif(btrim(renter_name), '') is not null),
  constraint rentals_dates_check
    check (ended_on is null or ended_on >= started_on)
);

-- Um carro so pode estar em uma locacao ativa por vez.
create unique index if not exists rentals_one_active_per_vehicle
  on public.rentals (vehicle_id) where status = 'active';
create index if not exists rentals_due_idx
  on public.rentals (next_due_on) where status = 'active';
create index if not exists rentals_customer_idx on public.rentals (customer_id);

drop trigger if exists rentals_set_updated_at on public.rentals;
create trigger rentals_set_updated_at
  before update on public.rentals
  for each row execute function public.set_updated_at();

create table if not exists public.rental_payments (
  id            uuid primary key default gen_random_uuid(),
  rental_id     uuid not null references public.rentals(id) on delete cascade,
  amount        numeric(10, 2) not null check (amount >= 0),
  paid_on       date not null default current_date,
  covers_due_on date,
  notes         text,
  recorded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

create index if not exists rental_payments_rental_idx
  on public.rental_payments (rental_id, paid_on desc);

-- --------------------------------------------- status do veiculo em sincronia
-- Evita o erro classico de o carro continuar aparecendo na vitrine depois de
-- alugado, ou sumir dela depois de devolvido.

create or replace function public.sync_vehicle_rental_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    update public.vehicles set status = 'rented'
    where id = new.vehicle_id and status <> 'archived';
  elsif tg_op = 'UPDATE' and new.status = 'closed' and old.status = 'active' then
    update public.vehicles set status = 'available'
    where id = new.vehicle_id and status = 'rented';
  end if;
  return new;
end;
$$;

drop trigger if exists rentals_sync_vehicle_status on public.rentals;
create trigger rentals_sync_vehicle_status
  after insert or update on public.rentals
  for each row execute function public.sync_vehicle_rental_status();

-- ------------------------------------------------------- registrar pagamento
-- Numa funcao so para nao existir estado pela metade: gravar o recebimento e
-- empurrar o vencimento sao a mesma operacao. Roda com as permissoes de quem
-- chama, entao a RLS continua valendo.

create or replace function public.register_rental_payment(
  p_rental_id uuid,
  p_amount numeric default null,
  p_paid_on date default current_date
)
returns public.rentals
language plpgsql
set search_path = public
as $$
declare
  rental public.rentals;
begin
  select * into rental from public.rentals where id = p_rental_id for update;
  if not found then
    raise exception 'Rental not found' using errcode = 'no_data_found';
  end if;

  insert into public.rental_payments (rental_id, amount, paid_on, covers_due_on, recorded_by)
  values (rental.id, coalesce(p_amount, rental.rate_amount), p_paid_on, rental.next_due_on, auth.uid());

  update public.rentals
     set next_due_on = case rental.plan
                         when 'weekly' then rental.next_due_on + 7
                         else (rental.next_due_on + interval '1 month')::date
                       end
   where id = rental.id
   returning * into rental;

  return rental;
end;
$$;

-- ---------------------------------------------------------------------- views

-- Cobrancas em aberto das locacoes ativas, com a mesma logica de semaforo dos
-- documentos -- as faixas sao mais curtas porque cobranca vence toda semana.
create or replace view public.v_rental_due
with (security_invoker = true) as
select
  r.id,
  r.vehicle_id,
  r.customer_id,
  coalesce(nullif(btrim(r.renter_name), ''), p.full_name, p.email, 'Unknown') as renter,
  r.plan,
  r.rate_amount,
  r.deposit_amount,
  r.started_on,
  r.next_due_on,
  r.notes,
  v.make,
  v.model,
  v.year,
  v.plate,
  (r.next_due_on - current_date) as days_to_due,
  case
    when r.next_due_on <  current_date     then 'overdue'
    when r.next_due_on =  current_date     then 'due_today'
    when r.next_due_on <= current_date + 3 then 'soon'
    when r.next_due_on <= current_date + 7 then 'upcoming'
    else 'ok'
  end as urgency,
  (select max(pay.paid_on) from public.rental_payments pay where pay.rental_id = r.id) as last_paid_on,
  (select coalesce(sum(pay.amount), 0) from public.rental_payments pay where pay.rental_id = r.id) as total_paid
from public.rentals r
join public.vehicles v on v.id = r.vehicle_id
left join public.profiles p on p.id = r.customer_id
where r.status = 'active';

-- Acrescenta os numeros de locacao aos cards do topo do dashboard.
-- Colunas novas entram no fim para o create or replace ser aceito.
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
    where urgency in ('due_today', 'soon', 'upcoming'))                 as payments_due_soon;

-- ------------------------------------------------------------------------ RLS

alter table public.rentals enable row level security;
alter table public.rental_payments enable row level security;

grant select, insert, update, delete on public.rentals, public.rental_payments to authenticated;
grant all on public.rentals, public.rental_payments to service_role;
grant select on public.v_rental_due to authenticated;
grant execute on function public.register_rental_payment(uuid, numeric, date) to authenticated;

drop policy if exists "locacoes: admin gerencia" on public.rentals;
create policy "locacoes: admin gerencia"
  on public.rentals for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- O cliente pode ver a propria locacao (base para a area dele mostrar isso).
drop policy if exists "locacoes: cliente ve a sua" on public.rentals;
create policy "locacoes: cliente ve a sua"
  on public.rentals for select
  to authenticated using (customer_id = auth.uid());

drop policy if exists "pagamentos: admin gerencia" on public.rental_payments;
create policy "pagamentos: admin gerencia"
  on public.rental_payments for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pagamentos: cliente ve os seus" on public.rental_payments;
create policy "pagamentos: cliente ve os seus"
  on public.rental_payments for select
  to authenticated using (
    exists (
      select 1 from public.rentals r
      where r.id = rental_payments.rental_id and r.customer_id = auth.uid()
    )
  );
