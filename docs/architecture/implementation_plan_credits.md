# Plan de Implementación: Wallet System, Motor Dual y Regeneración

Este plan define la ejecución técnica para implementar la economía de créditos, enganchándola a la interfaz actual (botón de regenerar) y asegurando integridad transaccional matemática y atómica.

## User Review Required

> [!IMPORTANT]
> **Plan Final Congelado (Luz Verde Total).**
> - La función de cobro garantiza la atomicidad de Base de Datos combinando el UPDATE de saldo y el INSERT del Ledger en una sola transacción PL/pgSQL.

## Proposed Changes

### 1. Esquema de Base de Datos y Atomicidad Real
#### [NEW] `supabase/migrations/xxxx_create_profiles_and_wallet.sql`
- **Tabla `profiles` y `credit_transactions`** (Misma estructura previa).
- **Función Atómica (El Guardián Transaccional Completo):**
  ```sql
  CREATE OR REPLACE FUNCTION atomic_spend(p_user_id UUID, p_amount INT, p_adventure_id UUID, p_type transaction_type)
  RETURNS UUID AS $$
  DECLARE
    v_transaction_id UUID;
  BEGIN
    -- 1. Intentar el cobro atómico
    UPDATE profiles SET credits = credits - p_amount 
    WHERE id = p_user_id AND credits >= p_amount;
    
    -- 2. Check estricto: Si no hay saldo, abortar (rollback silencioso)
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    -- 3. Crear la fila 'pending' en la misma transacción
    INSERT INTO credit_transactions (user_id, amount, type, status, adventure_id)
    VALUES (p_user_id, -p_amount, p_type, 'pending', p_adventure_id)
    RETURNING id INTO v_transaction_id;

    -- 4. Devolver el ID al backend para que luego lo marque como completed/refunded
    RETURN v_transaction_id;
  END;
  $$ LANGUAGE plpgsql;
  ```

#### [NEW] `supabase/migrations/xxxx_auth_triggers.sql`
- **Trigger Regalo:** Al registrarse, inyecta 50 créditos.

### 2. Lógica Backend (Motor Dual y Seguridad Transaccional)

#### [MODIFY] `supabase/functions/generate-quiz/index.ts`
- **Fallo Parcial y Check Atómico Estricto:**
  1. Input: `{ mode: 'ai', num_questions: 5 }`.
  2. Ejecuta RPC `transaction_id = atomic_spend(user_id, 50, adventure_id, 'generation')`. 
  3. **Check en código:** `if (!transaction_id) { throw new Error('402: Insufficient funds'); }`.
  4. Ejecuta peticiones a IA.
  5. **Doble Fallback:** Si IA falla -> Pexels. Si Pexels falla -> `public/assets/fallback.jpg`.
  6. **Transparencia en DB:** Imágenes de fallback llevan el metadato `source: 'stock_fallback'`.
  7. Al final, ejecuta `refund_credits(user_id, 20, transaction_id)` por las 2 fallidas (actualizando la transacción y devolviendo el saldo).

#### [NEW] `supabase/functions/generate-image/index.ts`
- **Flujo Individual (Botón Regenerar):**
  1. Chequeo atómico: `atomic_spend(user_id, 15, adventure_id, 'regeneration')`.
  2. Si acierta, la imagen pasa de `source: 'stock_fallback'` a `source: 'ai'`.

### 3. Gobernanza y Resiliencia
- **Actualización de Reglas (`AGENTS.md`):** Antes de aplicar las migraciones, añadir el flujo de `supabase/migrations/` al *SQL Lock*.
- **Cron Cleanup (`pg_cron`):** Tarea cada 5 mins para limpiar transacciones `pending` (ej. por Hard-Timeout del backend).

### 4. Mejoras UX (Client-Side)
- Bloqueo visual del selector de retos si el saldo es insuficiente.
- Throttling/Debounce en botón Stock de Invitados (Pexels rate-limit).
- **Banner de Transparencia:** Mostrar un aviso amigable ("Foto de archivo - IA saturada, no cobrada") para imágenes con `source: 'stock_fallback'`.

## Verification Plan
1. **Prueba SQL y Ledger:** Ejecutar `atomic_spend` con saldo insuficiente. Verificar que retorna `NULL` y no crea ninguna fila en `credit_transactions`.
2. **Prueba de Doble Fallback:** Forzar fallo de IA y bloquear URL de Pexels. Verificar que la imagen es el placeholder local y la API devuelve los créditos.
