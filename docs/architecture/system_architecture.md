# AventurIA: System Architecture & SaaS Vision

Este documento define la arquitectura técnica y de negocio de AventurIA consolidada tras la **Fase 1 (Arquitectura Asíncrona)**.

## 1. Visión del Producto (SaaS)
Evolucionar de una herramienta educativa a un SaaS profesional, garantizando la retención de usuarios ("Product-Led Growth") y una protección técnica absoluta contra abusos de API, cuellos de botella y costes descontrolados.

## 2. Economía y Tiers de Usuario

### 2.1. Invitado (Tier 0)
- **Permisos:** Jugar aventuras compartidas y ver resultados.
- **Creación (Modo Stock Obligatorio):** Pueden crear aventuras gratis. La IA redacta el texto, pero las imágenes se extraen obligatoriamente de bancos de fotos gratuitos (Pexels). Cero coste de IA visual. No se les cobra créditos.

### 2.2. Registrado Gratuito (Tier 1)
- **Regalo de Bienvenida:** 50 Créditos al registrarse (vía Database Trigger).
- **Costes:** 
  - **Generar (Aventura):** 10 Créditos por imagen solicitada.
  - **Regenerar (Imagen):** 15 Créditos por foto individual editada.
  - **Textos:** Infraestructura gratuita.

### 2.3. Premium / Comprador (Tier 2 - Futuro)
- Integración de Stripe planificada para comprar paquetes de créditos puntuales o suscripciones, actualizando la tabla `credit_transactions` mediante webhooks y RPCs.

## 3. Arquitectura Técnica (Fire & Forget con Polling)

Para evitar que procesos largos (Gemini) rompan las conexiones o colapsen el Edge Runtime, se utiliza un sistema asíncrono de tickets:

1. **Frontend (`useGameGen.ts`):** 
   - Solicita la generación a la API (`generate-adventure`).
   - Muestra la sala de espera e inicia un **polling cada 3 segundos** consultando la tabla `adventures` por el `id` asignado.
   
2. **Ticket Issuer (`generate-adventure`):** 
   - Función síncrona, rápida.
   - Cobra los créditos atómicamente (`spendCredits`).
   - Inserta una fila en `adventures` con `status: 'processing'`.
   - Devuelve el ticket `{ adventureId, status }` al cliente inmediatamente.
   
3. **Webhook de Base de Datos (`pg_net`):** 
   - Un trigger en la tabla `adventures` captura el `INSERT` con `status = 'processing'` y hace una petición HTTP POST a la URL pública de `process-adventure`.
   
4. **Background Worker (`process-adventure`):** 
   - Se ejecuta en segundo plano aislado.
   - Genera el contenido con Gemini.
   - Reembolsa créditos proporcionalmente si hay fallos (Fallback a Pexels o Imagen Local).
   - Sube imágenes al Storage y actualiza la fila a `status: 'completed'`.

## 4. Reglas Estrictas de Almacenamiento (Cero Base64)

Para garantizar la integridad y el rendimiento de la base de datos JSONB:
- **Prohibición de Base64:** Ninguna respuesta de IA que contenga imagen en Base64 se guarda directamente en la base de datos.
- **Supabase Storage:** Todas las imágenes generadas se convierten a `Uint8Array` y se suben al bucket `adventure_images`.
- Las funciones asíncronas (`process-adventure`) y de regeneración (`generate-image`) guardan **exclusivamente URLs públicas** en la base de datos bajo el campo `imageData`.

## 5. Prevención de Robos ("Zero-Theft Policy")

1. **Cobros Atómicos:** El servidor descuenta los créditos ejecutando una función RPC (`atomic_spend`) que devuelve `null` si no hay fondos suficientes, garantizando el bloqueo previo.
2. **Rollback de Créditos:** Si el sistema falla y no entrega la imagen de IA, el Background Worker reembolsa silenciosamente (`refundCredits`) y cambia a fallback.
3. **Cron de Limpieza:** Un trabajo de `pg_cron` programado cada 5 minutos devuelve automáticamente cualquier crédito que se haya quedado atrapado en estado `pending` por una caída catastrófica del servidor que haya impedido el reembolso manual.
