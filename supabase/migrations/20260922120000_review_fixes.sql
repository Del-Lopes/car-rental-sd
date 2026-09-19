-- Correcoes da revisao geral. Pode rodar de novo sem efeito colateral.

-- ------------------------------------------ 1. cliente nao aprova o proprio doc
-- A policy de insert so conferia o dono. Chamando a API direto, o cliente podia
-- enviar o documento ja com status 'approved'. Para quem nao e admin, todo
-- envio entra como pendente, sem revisor.

create or replace function public.force_pending_customer_document()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.status      := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.notes       := null;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_documents_force_pending on public.customer_documents;
create trigger customer_documents_force_pending
  before insert on public.customer_documents
  for each row execute function public.force_pending_customer_document();

-- ------------------------------------------------ 2. excluir cliente ou admin
-- Locacao com cliente cadastrado guarda so o customer_id. Ao excluir a conta, o
-- id vira null e a locacao ficaria sem ninguem -- o check barrava a exclusao.
-- Antes de apagar o perfil, o nome dele e copiado para a locacao.

create or replace function public.keep_renter_name_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rentals
     set renter_name = coalesce(nullif(btrim(old.full_name), ''), old.email, 'Former customer')
   where customer_id = old.id
     and nullif(btrim(renter_name), '') is null;
  return old;
end;
$$;

drop trigger if exists profiles_keep_renter_name on public.profiles;
create trigger profiles_keep_renter_name
  before delete on public.profiles
  for each row execute function public.keep_renter_name_on_profile_delete();

-- Contrato assinado e imutavel, mas perder o vinculo com uma conta excluida nao
-- altera o que foi assinado: o nome fica no snapshot e em signed_name.
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
    or (new.customer_id is distinct from old.customer_id and new.customer_id is not null)
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

-- Termos publicados sao imutaveis; a unica excecao e perder o vinculo com o
-- admin que publicou, quando a conta dele e excluida (created_by vira null).
create or replace function public.block_terms_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.created_by is null
     and old.created_by is not null
     and (to_jsonb(new) - 'created_by') = (to_jsonb(old) - 'created_by') then
    return new;
  end if;
  raise exception 'Published terms cannot be changed. Publish a new version instead.'
    using errcode = '42501';
end;
$$;

-- Admin que revisou documento ou registrou pagamento tambem nao podia ser
-- excluido: as FKs nao tinham regra de delete.
alter table public.customer_documents
  drop constraint if exists customer_documents_reviewed_by_fkey,
  add constraint customer_documents_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id) on delete set null;

alter table public.rental_payments
  drop constraint if exists rental_payments_recorded_by_fkey,
  add constraint rental_payments_recorded_by_fkey
    foreign key (recorded_by) references public.profiles(id) on delete set null;

-- ------------------------------------------ 3. cadastro le os tipos de documento
-- A tela de cadastro e publica e lista os documentos exigidos; o visitante
-- anonimo recebia lista vazia.

grant select on public.customer_document_types to anon;

drop policy if exists "tipos de doc de cliente: leitura publica" on public.customer_document_types;
create policy "tipos de doc de cliente: leitura publica"
  on public.customer_document_types for select
  to anon using (is_active);

-- ------------------------------------------------------- 4. fuso de San Diego
-- current_date usava UTC: um pagamento virava "atrasado" as 17h do dia do
-- vencimento em San Diego. Com o fuso do banco em Los Angeles, views, defaults
-- e funcoes passam a usar o dia local. Timestamps nao mudam (sao absolutos).

do $$
begin
  execute format('alter database %I set timezone to %L', current_database(), 'America/Los_Angeles');
end $$;

-- ------------------------------------------ 5. carro da reserva volta a reserva
-- Alugar um carro da reserva e permitido; ao devolver, ele ia para 'available'
-- e aparecia na vitrine. A locacao passa a lembrar de onde o carro saiu.

alter table public.rentals add column if not exists vehicle_status_before public.vehicle_status;

create or replace function public.remember_vehicle_status_before_rental()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select status into new.vehicle_status_before from public.vehicles where id = new.vehicle_id;
  return new;
end;
$$;

drop trigger if exists rentals_remember_vehicle_status on public.rentals;
create trigger rentals_remember_vehicle_status
  before insert on public.rentals
  for each row execute function public.remember_vehicle_status_before_rental();

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
    update public.vehicles
       set status = case when new.vehicle_status_before = 'reserve' then 'reserve'::public.vehicle_status
                         else 'available'::public.vehicle_status end
     where id = new.vehicle_id and status = 'rented';
  end if;
  return new;
end;
$$;
