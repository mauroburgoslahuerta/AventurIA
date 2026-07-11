import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export type TransactionType = 'generation' | 'regeneration' | 'refund' | 'gift' | 'purchase';

export class InsufficientFundsError extends Error {
  constructor(message: string = '402: Insufficient funds') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

/**
 * Intenta cobrar créditos de forma atómica.
 * Lanza un InsufficientFundsError si el saldo no es suficiente (NULL en base de datos).
 * Retorna el ID de la transacción generada si hay éxito.
 * 
 * @param amount Cantidad dinámica calculada (ej. num_images * 10)
 */
export async function spendCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: TransactionType,
  adventureId?: string
): Promise<string> {
  const { data: transactionId, error } = await supabase.rpc('atomic_spend', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_adventure_id: adventureId || null
  });

  if (error) {
    console.error('Database error in atomic_spend:', error);
    throw new Error(`Database Error: ${error.message}`);
  }

  // VALIDACIÓN ESTRICTA (Regla de Auditoría de la Fase 1)
  // Si la función SQL devuelve null, significa que no hubo saldo suficiente y se hizo rollback silencioso.
  if (transactionId === null) {
    console.warn(`[Wallet] Insufficient funds for user ${userId}. Attempted to spend ${amount} (${type}).`);
    throw new InsufficientFundsError();
  }

  return transactionId;
}

/**
 * Función preparada para devolver créditos si el proceso de IA falla posteriormente.
 * (Cumple el requerimiento del 'Doble Fallback').
 */
export async function refundCredits(
  supabase: SupabaseClient,
  transactionId: string,
  amount: number
): Promise<void> {
  // Esta función queda preparada como interfaz inicial para la siguiente etapa de fallbacks.
  // Ej: await supabase.rpc('refund_credits', { p_transaction_id: transactionId, p_amount: amount })
  console.warn(`Refund function called but not yet implemented in DB. TxtID: ${transactionId}`);
  throw new Error("refundCredits Not implemented yet in database layer");
}
