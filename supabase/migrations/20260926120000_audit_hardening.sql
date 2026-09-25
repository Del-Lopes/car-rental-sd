-- Auditoria final: seguranca, cobranca e documentos vencidos.
-- Pode rodar de novo sem efeito colateral.

-- =================================================== 1. seguranca do perfil
-- A policy deixava o cliente alterar qualquer coluna do proprio perfil --
-- inclusive as observacoes internas do admin e o e-mail para onde vai a copia
-- do contrato. Agora so nome e telefone sao editaveis pela API.

revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Documento tem de ficar na pasta do proprio dono. Hoje quem impede e a policy
-- do Storage; este check garante o mesmo no banco.
alter table public.customer_documents
  drop constraint if exists customer_documents_path_owner_check;
alter table public.customer_documents
  add constraint customer_documents_path_owner_check
  check (file_path like profile_id::text || '/%');

-- Funcoes de gatilho sem search_path fixo: endurecimento, sem mudanca de uso.
alter function public.set_updated_at() set search_path = public;
alter function public.stamp_document_review() set search_path = public;
alter function public.block_terms_changes() set search_path = public;
alter function public.protect_signed_agreement() set search_path = public;
alter function public.force_pending_customer_document() set search_path = public;

-- ====================================== 2. cobranca: parcial e clique duplo
-- Antes, qualquer recebimento empurrava o vencimento um ciclo inteiro, mesmo
-- sendo parcial, e dois cliques (ou duas abas) empurravam dois ciclos.
--   p_advance_due  false = registra o valor sem mexer no vencimento
--   p_expected_due data que a tela mostrou; se ja mudou, o registro e recusado

drop function if exists public.register_rental_payment(uuid, numeric, date);

create or replace function public.register_rental_payment(
  p_rental_id uuid,
  p_amount numeric default null,
  p_paid_on date default current_date,
  p_advance_due boolean default true,
  p_expected_due date default null
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

  -- Protecao contra registrar duas vezes o mesmo ciclo: a tela diz qual
  -- vencimento estava mostrando e o banco confere antes de gravar.
  if p_expected_due is not null and p_expected_due <> rental.next_due_on then
    raise exception 'This payment was already recorded. Reload the page.'
      using errcode = '40001';
  end if;

  insert into public.rental_payments (rental_id, amount, paid_on, covers_due_on, recorded_by)
  values (
    rental.id,
    coalesce(p_amount, rental.rate_amount + rental.insurance_amount),
    p_paid_on,
    rental.next_due_on,
    auth.uid()
  );

  if p_advance_due then
    update public.rentals
       set next_due_on = case rental.plan
                           when 'weekly' then rental.next_due_on + 7
                           else (rental.next_due_on + interval '1 month')::date
                         end
     where id = rental.id
     returning * into rental;
  end if;

  return rental;
end;
$$;

revoke all on function public.register_rental_payment(uuid, numeric, date, boolean, date)
  from public, anon;
grant execute on function public.register_rental_payment(uuid, numeric, date, boolean, date)
  to authenticated;

-- ============================================= 3. documento vencido bloqueia
-- Carteira vencida contava como aprovada: o cliente aparecia como "Cleared to
-- rent". Documento aprovado com validade no passado volta a contar como falta.

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
          and (d.expires_at is null or d.expires_at >= current_date)
      )
  )                                                            as required_missing,
  -- Coluna nova sempre no fim, senao o create or replace e recusado.
  (
    select count(*) from public.customer_documents d
    where d.profile_id = p.id
      and d.status = 'approved'
      and d.expires_at is not null
      and d.expires_at < current_date
  )                                                            as documents_expired
from public.profiles p
left join public.customer_documents cd on cd.profile_id = p.id
where p.role = 'customer'
group by p.id;
