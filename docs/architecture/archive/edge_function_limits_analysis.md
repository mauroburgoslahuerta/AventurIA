# Análisis de Límites Arquitectónicos: Vercel Serverless vs Supabase Edge Functions

**Fecha:** 14 de Julio de 2026
**Autor:** Mauro Burgos & Senior Technical Partner

## El Problema Descubierto

Durante la implementación del sistema de economía (créditos) para AventurIA, la aplicación experimentó una degradación crítica al generar aventuras con imágenes de IA, fallando silenciosamente y haciendo *fallback* constante a imágenes de archivo (devolviendo los créditos cobrados).

Tras un análisis profundo, se diagnosticó que el problema no residía en las restricciones de la API Key (CORS/Referer) ni en el modelo en sí (`gemini-2.5-flash-image`), sino en un **cuello de botella arquitectónico** provocado al migrar la lógica desde Vercel hacia Supabase Edge Functions.

### La Arquitectura Original (Rama `main`)
En su estado original, la aplicación no tenía economía real, por lo que la arquitectura priorizaba la fluidez:
1. **Infraestructura:** Todo corría sobre Vercel Serverless Functions (`api/generate-game` y `api/generate-image`).
2. **Flujo de Carga:** El cliente pedía el texto, y luego esperaba a que se resolvieran secuencialmente las **tres primeras imágenes** antes de dejar entrar al jugador.
3. **Lazy Loading:** El resto de imágenes se iban pidiendo en segundo plano bajo demanda.
4. **Resultado:** Al delegar la carga al cliente y usar Serverless puro, no había colapsos por peso o tiempo.

### La Arquitectura Centralizada (Rama `develop`)
Al requerir que los usuarios pagasen con créditos, se introdujo una restricción de diseño para evitar trampas: la **Transacción Atómica**.
1. **Infraestructura:** La lógica se movió a Supabase Edge Functions (Deno).
2. **Centralización:** La función `generate-adventure` se encargaba de generar el texto, cobrar los créditos, generar las 5 imágenes secuencialmente en el servidor, empaquetarlo todo y devolverlo.
3. **El Colapso:** Forzamos el motor al chocar contra las limitaciones físicas de las Edge Functions de Supabase.

## Las Tres Bombas Estructurales

1. **La Bomba de Tiempo (Hard Timeout):**
   Las Edge Functions de Supabase tienen un límite de ejecución estricto de alrededor de 40-60 segundos. Generar 5 imágenes pesadas de IA secuencialmente en el servidor supera este límite. Si el proceso muere por timeout antes de procesar el reembolso, el usuario pierde el dinero y no recibe juego.

2. **La Bomba de Peso (Payload Limits):**
   Supabase impone un límite máximo de **5 MB** para el cuerpo de la respuesta de una Edge Function. 5 imágenes generadas por Gemini devueltas en formato Base64 superan con facilidad los 7.5 MB. El intento de retornar este bloque monolítico satura la memoria (RAM cap a 150MB) o corta la respuesta.

3. **El Embudo de API (Rate Limiting en Servidor):**
   Disparar 5 peticiones casi simultáneas (o en un bucle cerrado) desde la misma IP del servidor backend a la API de Google aumenta el riesgo exponencial de recibir un error HTTP 429 (*Too Many Requests*) en comparación con el enfoque distribuido desde el navegador de los clientes.

## Conclusión y Próximos Pasos

El intento de "asegurar" la transacción económica mediante una centralización total empeoró la aplicación de base, destruyendo la fiabilidad que ya tenía en la rama `main`.

**Solución Propuesta para la Próxima Refactorización:**
Es imperativo abandonar el enfoque de "todo en uno" en la Edge Function y volver a una **arquitectura descentralizada controlada**:
1. El backend (`generate-adventure`) solo se encargará de cobrar por el texto, generarlo y devolverlo.
2. El frontend (Vercel/React) volverá a coordinar la petición de las 3 primeras imágenes como lo hacía en `main`.
3. Cada petición de imagen se hará a un endpoint protegido individual (`generate-image`), el cual cobrará de forma atómica sus créditos respectivos *antes* de entregar la imagen. 

De esta forma, mantenemos la seguridad transaccional, respetamos los límites físicos de Supabase, y devolvemos la aplicación a su estado de fluidez original.
