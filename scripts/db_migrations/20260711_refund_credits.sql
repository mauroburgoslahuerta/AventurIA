-- Función RPC para ejecutar reembolsos parciales o totales (Fallback mechanism)
CREATE OR REPLACE FUNCTION public.refund_credits(p_transaction_id UUID, p_amount INT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_adventure_id UUID;
  v_new_transaction_id UUID;
BEGIN
  -- 1. Recuperar los datos de la transacción original
  SELECT user_id, adventure_id INTO v_user_id, v_adventure_id
  FROM public.credit_transactions
  WHERE id = p_transaction_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Transacción % no encontrada', p_transaction_id;
  END IF;

  -- 2. Devolver el saldo al usuario
  UPDATE public.profiles 
  SET credits = credits + p_amount 
  WHERE id = v_user_id;

  -- 3. Registrar el reembolso como una nueva transacción (contabilidad inmutable)
  INSERT INTO public.credit_transactions (user_id, amount, type, status, adventure_id)
  VALUES (v_user_id, p_amount, 'refund', 'completed', v_adventure_id)
  RETURNING id INTO v_new_transaction_id;

  RETURN v_new_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
