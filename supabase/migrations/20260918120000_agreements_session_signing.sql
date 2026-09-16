-- Carental :: assinatura de contrato com a sessao do proprio cliente
--
-- A versao anterior assinava pelo service_role, para que o IP gravado viesse
-- sempre do servidor. Isso exigia a chave service_role na Vercel. Decisao do
-- cliente (18/09/2026): dispensar essa chave. Agora:
--
-- - O cliente assina com a propria sessao. O dono do contrato e sempre o
--   usuario logado (auth.uid()), nunca um parametro -- ninguem assina por outro.
-- - Continuam garantidos pelo banco: nome igual ao do cadastro, versao vigente
--   dos termos, data/hora do servidor, contrato assinado imutavel.
-- - O que se perde: IP e navegador passam a ser informados pela aplicacao, e um
--   cliente que chamasse a API direto poderia gravar valores falsos. Sao dados
--   de apoio; a prova principal (aceite + nome + data + termos) nao depende deles.
--
-- Segura para rodar mais de uma vez.

create or replace function public.sign_my_rental_agreement(
  p_agreement_id     uuid,
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
begin
  if auth.uid() is null then
    raise exception 'You need to be signed in to sign an agreement' using errcode = '42501';
  end if;

  -- Reaproveita todas as validacoes da funcao original, com o dono fixado na sessao.
  return public.sign_rental_agreement(
    p_agreement_id,
    auth.uid(),
    p_terms_version_id,
    p_signed_name,
    p_ip,
    p_user_agent
  );
end;
$$;

revoke all on function public.sign_my_rental_agreement(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.sign_my_rental_agreement(uuid, uuid, text, text, text) to authenticated;

-- Carimbo de "copia enviada por e-mail". So o dono ou o admin, e so em contrato
-- ja assinado. Nao toca em nenhum outro campo.
create or replace function public.mark_agreement_email_sent(p_agreement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rental_agreements
     set email_sent_at = now()
   where id = p_agreement_id
     and status = 'signed'
     and (customer_id = auth.uid() or public.is_admin());

  if not found then
    raise exception 'Agreement not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.mark_agreement_email_sent(uuid) from public, anon;
grant execute on function public.mark_agreement_email_sent(uuid) to authenticated;
