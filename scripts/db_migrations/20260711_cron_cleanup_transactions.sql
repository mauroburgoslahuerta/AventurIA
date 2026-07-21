-- 1. Función para limpiar y reembolsar transacciones "pending" caducadas (más de 5 minutos)
CREATE OR REPLACE FUNCTION public.cleanup_pending_transactions()
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_record RECORD;
BEGIN
    FOR v_record IN 
        SELECT id, user_id, amount 
        FROM public.credit_transactions 
        WHERE status = 'pending' AND created_at < timezone('utc'::text, now()) - interval '5 minutes'
    LOOP
        -- El 'amount' en la tabla credit_transactions se guardó en negativo (ej: -15).
        -- Al restar un negativo, matemáticamente sumamos el saldo de vuelta al usuario.
        UPDATE public.profiles 
        SET credits = credits - v_record.amount 
        WHERE id = v_record.user_id;

        -- Marcar la transacción como reembolsada por timeout
        UPDATE public.credit_transactions 
        SET status = 'refunded' 
        WHERE id = v_record.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Habilitar extensión pg_cron (en Supabase suele estar pre-instalada o se puede activar con este comando)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 3. Programar el cron (cada 5 minutos)
-- Desprogramamos primero por si el script se corre más de una vez (evitar duplicados)
SELECT cron.unschedule('cleanup-pending-transactions');

-- Programamos la tarea llamando a nuestra función
SELECT cron.schedule(
  'cleanup-pending-transactions', -- nombre único de la tarea
  '*/5 * * * *',                  -- formato cron: cada 5 minutos
  'SELECT public.cleanup_pending_transactions()'
);
