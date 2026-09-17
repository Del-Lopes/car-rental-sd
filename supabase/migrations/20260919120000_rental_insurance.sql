-- Carental :: seguro na locacao
--
-- Regra do negocio (cliente, 19/09/2026): todo locatario precisa de seguro.
-- Ou usa o proprio, ou e incluido no seguro da Carental. Na inclusao o preco
-- varia conforme a carteira de motorista -- costuma comecar em US$ 20/semana --
-- entao e definido pelo dono, por locacao.
--
-- Fluxo:
--   1. Ao registrar a locacao, o dono informa o valor oferecido por ciclo do
--      plano (insurance_offer_amount). Vazio = a Carental nao oferece seguro
--      para essa locacao; o locatario so pode usar o proprio.
--   2. Ao assinar o contrato, o locatario escolhe: 'own' ou 'carental'.
--   3. Escolhendo 'carental', o valor passa a compor a cobranca do ciclo
--      (insurance_amount), e o contrato congela a escolha e o total.
--
-- Segura para rodar mais de uma vez.

-- ------------------------------------------------------------------ colunas

alter table public.rentals
  add column if not exists insurance_offer_amount numeric(10, 2)
    check (insurance_offer_amount >= 0),
  add column if not exists insurance_amount numeric(10, 2) not null default 0
    check (insurance_amount >= 0);

alter table public.rental_agreements
  add column if not exists insurance_choice text
    check (insurance_choice in ('own', 'carental'));

-- --------------------------------------------------------------- assinatura
-- A escolha do seguro passa a ser parametro obrigatorio. As assinaturas antigas
-- (sem esse parametro) sao removidas para nao existir um caminho que assine sem
-- registrar a escolha.

drop function if exists public.sign_my_rental_agreement(uuid, uuid, text, text, text);
drop function if exists public.sign_rental_agreement(uuid, uuid, uuid, text, text, text);

create or replace function public.sign_rental_agreement(
  p_agreement_id     uuid,
  p_customer_id      uuid,
  p_terms_version_id uuid,
  p_signed_name      text,
  p_ip               text,
  p_user_agent       text,
  p_insurance_choice text
)
returns public.rental_agreements
language plpgsql
security definer
set search_path = public
as $$
declare
  agreement      public.rental_agreements;
  rental         public.rentals;
  current_terms  uuid;
  profile_name   text;
  applied_amount numeric(10, 2);
  snapshot       jsonb;
begin
  select * into agreement from public.rental_agreements where id = p_agreement_id for update;
  if not found or agreement.customer_id is distinct from p_customer_id then
    raise exception 'Agreement not found' using errcode = 'P0002';
  end if;
  if agreement.status = 'signed' then
    raise exception 'This agreement is already signed' using errcode = 'P0001';
  end if;

  select * into rental from public.rentals where id = agreement.rental_id for update;
  if rental.status <> 'active' then
    raise exception 'This rental is no longer active' using errcode = 'P0001';
  end if;

  select id into current_terms from public.terms_versions order by version desc limit 1;
  if current_terms is null then
    raise exception 'Rental terms have not been published yet' using errcode = 'P0001';
  end if;
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

  if p_insurance_choice is null or p_insurance_choice not in ('own', 'carental') then
    raise exception 'Choose how this rental will be insured' using errcode = 'P0001';
  end if;
  if p_insurance_choice = 'carental' and rental.insurance_offer_amount is null then
    raise exception 'Carental insurance is not available for this rental. Please use your own insurance.'
      using errcode = 'P0001';
  end if;

  applied_amount := case when p_insurance_choice = 'carental' then rental.insurance_offer_amount else 0 end;

  -- A cobranca passa a refletir a escolha feita no contrato.
  update public.rentals set insurance_amount = applied_amount where id = rental.id;

  select jsonb_build_object(
           'vehicle', concat_ws(' ', v.year, v.make, v.model),
           'plate', v.plate,
           'plan', rental.plan,
           'rate_amount', rental.rate_amount,
           'deposit_amount', rental.deposit_amount,
           'started_on', rental.started_on,
           'next_due_on', rental.next_due_on,
           'renter', profile_name,
           'insurance_choice', p_insurance_choice,
           'insurance_offer_amount', rental.insurance_offer_amount,
           'insurance_amount', applied_amount,
           'total_amount', rental.rate_amount + applied_amount
         )
    into snapshot
    from public.vehicles v
   where v.id = rental.vehicle_id;

  update public.rental_agreements
     set status            = 'signed',
         terms_version_id  = current_terms,
         rental_snapshot   = snapshot,
         insurance_choice  = p_insurance_choice,
         signed_name       = btrim(p_signed_name),
         signed_at         = now(),
         signer_ip         = left(p_ip, 64),
         signer_user_agent = left(p_user_agent, 512)
   where id = agreement.id
  returning * into agreement;

  return agreement;
end;
$$;

revoke all on function public.sign_rental_agreement(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.sign_rental_agreement(uuid, uuid, uuid, text, text, text, text) to service_role;

create or replace function public.sign_my_rental_agreement(
  p_agreement_id     uuid,
  p_terms_version_id uuid,
  p_signed_name      text,
  p_ip               text,
  p_user_agent       text,
  p_insurance_choice text
)
returns public.rental_agreements
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You need to be signed in to sign an agreement' using errcode = '42501';
  end if;

  return public.sign_rental_agreement(
    p_agreement_id, auth.uid(), p_terms_version_id, p_signed_name, p_ip, p_user_agent, p_insurance_choice
  );
end;
$$;

revoke all on function public.sign_my_rental_agreement(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.sign_my_rental_agreement(uuid, uuid, text, text, text, text) to authenticated;

-- A escolha do seguro tambem fica protegida depois da assinatura.
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
    or new.insurance_choice  is distinct from old.insurance_choice
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

-- ---------------------------------------------------------------- cobranca
-- Recebimento sem valor informado passa a considerar aluguel + seguro.

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
  values (
    rental.id,
    coalesce(p_amount, rental.rate_amount + rental.insurance_amount),
    p_paid_on,
    rental.next_due_on,
    auth.uid()
  );

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

-- -------------------------------------------------------------------- views
-- Colunas novas sempre no fim, para o create or replace ser aceito.

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
  (select coalesce(sum(pay.amount), 0) from public.rental_payments pay where pay.rental_id = r.id) as total_paid,
  r.insurance_offer_amount,
  r.insurance_amount,
  (r.rate_amount + r.insurance_amount) as total_amount
from public.rentals r
join public.vehicles v on v.id = r.vehicle_id
left join public.profiles p on p.id = r.customer_id
where r.status = 'active';

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
  concat_ws(' ', v.year, v.make, v.model) as vehicle_label,
  a.insurance_choice,
  r.insurance_offer_amount,
  r.insurance_amount
from public.rental_agreements a
join public.rentals r on r.id = a.rental_id
join public.vehicles v on v.id = r.vehicle_id
left join public.profiles p on p.id = a.customer_id
left join public.terms_versions t on t.id = a.terms_version_id;
