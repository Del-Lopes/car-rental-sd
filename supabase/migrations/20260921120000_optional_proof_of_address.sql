-- Comprovante de endereco passa a ser opcional: parte dos locatarios esta de
-- viagem e nao tem um. Quem nao enviar mostra na retirada do carro.
--
-- Os resumos (v_customer_document_summary, badge do painel, "Cleared to rent")
-- contam so os tipos obrigatorios, entao passam a ignora-lo sozinhos.
-- Pode rodar de novo sem efeito colateral.

update public.customer_document_types
   set is_required = false
 where slug = 'proof_of_address';
