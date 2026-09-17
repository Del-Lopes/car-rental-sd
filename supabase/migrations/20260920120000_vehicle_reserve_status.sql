-- Carental :: status "Reserve" no lugar de "Archived"
--
-- Decisao do cliente (20/09/2026): carro na reserva e um carro da frota como
-- qualquer outro -- aparece nos vencimentos de registration, nos contadores do
-- dashboard e pode ser alugado. A UNICA diferenca e nao aparecer na vitrine
-- publica (que ja lista so os disponiveis).
--
-- Antes, "archived" significava "fora da frota" e era excluido do dashboard.
-- Esta migration renomeia o valor (os carros arquivados viram reserva, sem
-- perder dados) e remove essas exclusoes.
--
-- Segura para rodar mais de uma vez.

-- --------------------------------------------------------------- renomeia
do $$
begin
  if exists (
    select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
     where t.typname = 'vehicle_status' and e.enumlabel = 'archived'
  ) then
    alter type public.vehicle_status rename value 'archived' to 'reserve';
  end if;
end $$;

-- ------------------------------------------------------------------ vitrine
-- Reserva continua fora do que o publico e os clientes enxergam; o admin ve tudo.

drop policy if exists "veiculos: vitrine publica" on public.vehicles;
create policy "veiculos: vitrine publica"
  on public.vehicles for select
  to anon, authenticated using (status <> 'reserve' or public.is_admin());

drop policy if exists "fotos: seguem a visibilidade do veiculo" on public.vehicle_photos;
create policy "fotos: seguem a visibilidade do veiculo"
  on public.vehicle_photos for select
  to anon, authenticated using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_photos.vehicle_id
        and (v.status <> 'reserve' or public.is_admin())
    )
  );

-- ---------------------------------------------------- vencimentos: sem exclusao

create or replace view public.v_expiring_vehicle_documents
with (security_invoker = true) as
select
  vd.id,
  vd.vehicle_id,
  vd.type_slug,
  vdt.label as type_label,
  vd.doc_number,
  vd.issued_at,
  vd.expires_at,
  vd.file_path,
  vd.notes,
  v.make,
  v.model,
  v.year,
  v.plate,
  v.status as vehicle_status,
  (vd.expires_at - current_date) as days_to_expire,
  case
    when vd.expires_at <  current_date                then 'expired'
    when vd.expires_at <= current_date + 15           then 'critical'
    when vd.expires_at <= current_date + 30           then 'warning'
    when vd.expires_at <= current_date + 60           then 'upcoming'
    else 'ok'
  end as urgency
from public.vehicle_documents vd
join public.vehicles v on v.id = vd.vehicle_id
join public.vehicle_document_types vdt on vdt.slug = vd.type_slug
where vd.expires_at is not null;

-- --------------------------------------------- contadores: reserva entra na frota
-- vehicles_reserve entra no fim para o create or replace ser aceito.

create or replace view public.v_admin_dashboard_stats
with (security_invoker = true) as
select
  (select count(*) from public.vehicles)                                 as vehicles_total,
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
    where a.status = 'pending' and r.status = 'active')                 as agreements_pending,
  (select count(*) from public.vehicles where status = 'reserve')        as vehicles_reserve;

-- ------------------------------------------------ locacao: reserva pode ser alugada

create or replace function public.sync_vehicle_rental_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    update public.vehicles set status = 'rented' where id = new.vehicle_id;
  elsif tg_op = 'UPDATE' and new.status = 'closed' and old.status = 'active' then
    update public.vehicles set status = 'available'
    where id = new.vehicle_id and status = 'rented';
  end if;
  return new;
end;
$$;

-- ------------------------------------------- contratos: cliente nao perde historico
-- O cliente nao enxerga carros na reserva (policy acima). Com join obrigatorio, um
-- contrato ja assinado sumiria da lista dele quando o carro fosse para a reserva.
-- O nome do veiculo cai para o que ficou congelado na assinatura.

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
  coalesce(
    nullif(concat_ws(' ', v.year, v.make, v.model), ''),
    a.rental_snapshot ->> 'vehicle',
    'Vehicle'
  ) as vehicle_label,
  a.insurance_choice,
  r.insurance_offer_amount,
  r.insurance_amount
from public.rental_agreements a
join public.rentals r on r.id = a.rental_id
left join public.vehicles v on v.id = r.vehicle_id
left join public.profiles p on p.id = a.customer_id
left join public.terms_versions t on t.id = a.terms_version_id;
