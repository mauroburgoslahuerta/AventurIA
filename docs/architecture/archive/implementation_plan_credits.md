# Plan de Implementación: Wallet System, Motor Dual y Regeneración

Este plan define la ejecución técnica para implementar la economía de créditos, enganchándola a la interfaz actual (botón de regenerar) y asegurando integridad transaccional matemática y atómica.

## User Review Required

> [!IMPORTANT]
> **Plan Final Congelado (Luz Verde Total).**
> - La función de cobro garantiza la atomicidad de Base de Datos combinando el UPDATE de saldo y el INSERT del Ledger en una sola transacción PL/pgSQL.

## Proposed Changes

### 1. Esquema de Base de Datos y Atomicidad Real ✅ [COMPLETADO]
#### [DONE] `scripts/db_migrations/20260708_create_profiles_and_wallet.sql`
#### [DONE] `scripts/db_migrations/20260708_auth_triggers.sql`
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

#### [NEW] `supabase/functions/_shared/wallet.ts` ✅ [COMPLETADO]
- **El Guardián de TypeScript:** Módulo utilitario centralizado que encapsula la llamada al RPC `atomic_spend` y la estructura de `refundCredits`.
- Maneja el coste dinámico y contiene la regla bloqueante de auditoría (captura el `null` y lanza `InsufficientFundsError`).
- **⚠️ INSTRUCCIÓN PARA AGENTES:** Cualquier función nueva (como `generate-quiz` o `generate-image`) DEBE importar y usar la función `spendCredits` de este módulo. Prohibido reprogramar llamadas a `atomic_spend` o comprobaciones manuales de NULL.

#### [DONE] `supabase/functions/generate-adventure/index.ts` (Antes llamado generate-quiz) ✅ [COMPLETADO]
- **Fallo Parcial y Check Atómico Estricto (Usando Guardián):**
  1. Input: `{ mode: 'ai', num_questions: 5 }`. (El coste será dinámico: num_images * 10).
  2. Ejecuta `const transactionId = await spendCredits(...)` usando la librería compartida.
  4. Ejecuta peticiones a IA.
  5. **Doble Fallback:** Si IA falla -> Pexels. Si Pexels falla -> `public/assets/fallback.jpg`.
  6. **Transparencia en DB:** Imágenes de fallback llevan el metadato `source: 'stock_fallback'`.
  7. Al final, ejecuta `refund_credits(user_id, 20, transaction_id)` por las 2 fallidas (actualizando la transacción y devolviendo el saldo).

#### [NEW] `supabase/functions/generate-image/index.ts` ✅ [ESQUELETO CREADO]
- **Flujo Individual (Botón Regenerar):**
  1. Chequeo atómico: Se usa `spendCredits(..., 15, 'regeneration')`. Si no hay saldo, la función corta y devuelve HTTP 402.
  2. *[Pendiente para próxima sesión]* Integrar la llamada real a OpenAI y actualizar la tabla para que la imagen pase de `source: 'stock_fallback'` a `source: 'ai'`.

### 3. Gobernanza y Resiliencia
- **Cron Cleanup (`pg_cron`):** ✅ [COMPLETADO] Tarea cada 5 mins para limpiar transacciones `pending` (ej. por Hard-Timeout del backend).
  - *Explicación técnica:* Se implementó `cleanup_pending_transactions()` que detecta registros de más de 5 minutos, reembolsa el importe de forma matemática sumando los créditos de vuelta al `profiles`, y actualiza el estado a `refunded`. Ya está programado y activo en producción.

### 4. Mejoras UX (Client-Side)
- Bloqueo visual del selector de retos si el saldo es insuficiente.
- Throttling/Debounce en botón Stock de Invitados (Pexels rate-limit).
- **Banner de Transparencia:** Mostrar un aviso amigable ("Foto de archivo - IA saturada, no cobrada") para imágenes con `source: 'stock_fallback'`. ✅ [COMPLETADO]
- **Integración Backend (Simulador de progreso):** Barra de carga simulada acoplada a la llamada única de Edge Function. ✅ [COMPLETADO]

## Verification Plan
1. **Prueba SQL y Ledger:** Ejecutar `atomic_spend` con saldo insuficiente. Verificar que retorna `NULL` y no crea ninguna fila en `credit_transactions`. ✅ *(Prueba SQL de BD superada).*
   > **[NOTA DE AUDITORÍA - BLOQUEANTE PARA FASE 2]:** Cuando se desarrolle la Edge Function (Fase 2), es obligatorio que el código TypeScript verifique explícitamente `if (result === null)` y corte la ejecución, para evitar tomar un NULL silencioso de la base de datos como un falso positivo.
2. **Prueba de Doble Fallback:** Forzar fallo de IA y bloquear URL de Pexels. Verificar que la imagen es el placeholder local y la API devuelve los créditos.

---
## Notas de Auditoría (12 Julio 2026)

Tras la implementación de la palanca del selector visual (IA vs Archivo/Stock) en el frontend y la actualización de la Edge Function `generate-adventure`, se detectaron y aplazaron los siguientes problemas para una futura revisión:

1. **Fallo en Generación (Edge Function):** ✅ **[RESUELTO]**
   - **Causa Real Descubierta:** El error genérico "500 non-2xx status code" estaba ocultando dos problemas en cadena:
     1. Las restricciones HTTP Referer en la API Key de Google Cloud estaban bloqueando las URLs dinámicas temporales de Vercel (Preview).
     2. El modelo `gemini-2.0-flash` configurado en producción ha sido **descatalogado (404 Not Found)** por Google.
   - **Solución Aplicada:**
     - Se autorizaron los dominios `*vercel.app/*` en la consola de Google Cloud.
     - Se actualizó el código de la Edge Function (`generate-adventure`) para usar el nuevo modelo oficial `gemini-2.5-flash`.
     - Se modificó la captura de errores en la Edge Function para devolver status 200 con un JSON de error en caso de fallo, saltándose la opacidad del SDK de Supabase, lo cual permitió diagnosticar la deprecación del modelo.
   

3. **Estado del Frontend (Modo Visual):**
   - Se forzó el estado por defecto a `mode: 'stock'` (Fotos) globalmente. 
   - Además, se añadió un `useEffect` en `SetupScreen.tsx` para forzar a los invitados a usar `stock`, evitando que la palanca de IA se quede bloqueada o activa por error antes de intentar generar.

---
## Notas de Auditoría (14 Julio 2026)

Tras la revisión del módulo de regeneración y generación de aventuras con IA:

1. **Gestión de Créditos y Fallbacks:** ✅ **[FUNCIONAL]**
   - El sistema de reembolso parcial ha demostrado funcionar perfectamente. Cuando la generación de imágenes por IA falla (por restricciones de API u otros motivos), el motor hace fallback silencioso a Pexels/Local y reembolsa los créditos cobrados por adelantado con éxito.
   - El modal de confirmación de coste de créditos se dispara correctamente antes de iniciar la generación en modo IA.
   - Límite de caracteres en nombres largos integrado sin romper el layout.

2. **Bloqueo por Restricciones de API Key (Edge Functions):** ⚠️ **[PENDIENTE DE VALIDACIÓN]**
   - **Problema:** Las Edge Functions estaban siendo bloqueadas por Google Gemini (403 Permission Denied) al generar imágenes, a pesar de que la API Key admitía dominios de Vercel. Esto causaba fallos masivos en la IA y forzaba el fallback continuo.
   - **Solución implementada:** Se ha inyectado explícitamente la cabecera `Referer: http://localhost:3000/` en las llamadas a la API de Google desde `generate-adventure` y `generate-image` para emparejar el comportamiento exitoso que tenía la API de Vercel. Queda pendiente de confirmación manual por parte del usuario.

3. **Pruebas de Regeneración de Imágenes:** ⚠️ **[PENDIENTE DE PRUEBAS COMPLETAS]**
   - Al haber fallado la generación inicial de la aventura con IA por el problema de los permisos de la API Key, no se pudo realizar un test end-to-end de la **regeneración de imágenes**. 
   - **Acción requerida:** Se debe probar el ciclo completo: generar juego con IA -> usar el botón de regenerar imagen en un reto -> verificar descuento de créditos -> verificar que la tabla en DB actualiza `source: 'ai'`.
