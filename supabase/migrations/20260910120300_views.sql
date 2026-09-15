-- Carental :: views de leitura
--
-- security_invoker = true faz a view rodar com as permissoes de quem consulta,
-- e nao do dono. Sem isso a RLS seria ignorada e qualquer usuario leria tudo.
-- (exige PostgreSQL 15+, padrao no Supabase)

-- Alimenta o dashboard de vencimentos com uma query so.
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
where vd.expires_at is not null
  and v.status <> 'archived';

-- Cards-resumo do topo do dashboard: uma linha, uma ida ao banco.
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
    where urgency in ('critical', 'warning', 'upcoming'))               as vehicle_docs_expiring;

-- Situacao da documentacao de cada cliente, para a lista do admin.
create or replace view public.v_customer_document_summary
with (security_invoker = true) as
select
  p.id as profile_id,
  p.full_name,
  p.email,
  p.phone,
  p.created_at,
  count(cd.id)                                                as documents_total,
  count(cd.id) filter (where cd.status = 'pending')            as documents_pending,
  count(cd.id) filter (where cd.status = 'approved')           as documents_approved,
  count(cd.id) filter (where cd.status = 'rejected')           as documents_rejected,
  (
    select count(*) from public.customer_document_types t
    where t.is_required and t.is_active
      and not exists (
        select 1 from public.customer_documents d
        where d.profile_id = p.id
          and d.type_slug = t.slug
          and d.status = 'approved'
      )
  )                                                            as required_missing
from public.profiles p
left join public.customer_documents cd on cd.profile_id = p.id
where p.role = 'customer'
group by p.id;

grant select on public.v_expiring_vehicle_documents to authenticated;
grant select on public.v_admin_dashboard_stats to authenticated;
grant select on public.v_customer_document_summary to authenticated;
