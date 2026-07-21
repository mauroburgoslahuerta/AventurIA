# Arquitectura Asíncrona ("El Sistema del Ticket")

Basado en la auditoría técnica, este es el plan definitivo para crear un sistema a prueba de balas que nunca se cuelgue, no importa lo lenta que vaya la IA o si el usuario pierde el WiFi.

## User Review Required
> [!IMPORTANT]
> **Aprobación de la Arquitectura Asíncrona**
> Vamos a cambiar cómo se comunican la web y el servidor. En lugar de que la web espere mirando fijamente al servidor hasta que termine todo, le daremos un sistema de "preguntar cada 3 segundos" (Polling) para ver si la aventura ya está lista, mientras el servidor trabaja tranquilo en segundo plano. ¿Estás de acuerdo con este cambio?

## Proposed Changes

### 1. El Cobro y el "Ticket" Rápido (Backend Síncrono)
- **Flujo inicial:** El usuario le da a "Generar".
- **Nueva Acción:** El servidor cobra los 50 créditos y crea una fila vacía en la base de datos de AventurIA con el estado `procesando`.
- **Respuesta inmediata:** El servidor NO espera a la IA. Le devuelve a la web al instante (en 0.5 segundos) un ID (ej. `Aventura #123`).

### 2. El Trabajo Pesado (Edge Function en Segundo Plano)
- **Desacoplamiento:** Supabase lanza el trabajo pesado "en la sombra" (Fire and Forget).
- **Proceso seguro:** Genera el texto, genera las imágenes de 2 en 2 para no saturar a Google ni la memoria de Supabase, las sube al Storage y guarda las URLs.
- **Aviso de fin:** Cuando termina, cambia el estado de la fila en la base de datos a `completado`.

### 3. El Frontend (La Sala de Espera de React)
- **`useGameGen.ts` Refactorizado:** En cuanto recibe el "Ticket" (ID), la web pone una pantalla de carga bonita.
- **Polling (Preguntar sin agobiar):** La web pregunta a Supabase cada 3 segundos: *"¿El ticket 123 ya dice completado?"*.
- **Despliegue mágico:** Cuando Supabase dice "Sí, completado", la web descarga los datos y el usuario empieza a jugar.

### Beneficios Reales
1. **Nunca hay Error de Timeout:** La conexión dura menos de 1 segundo.
2. **Cero abusos a Google:** Podemos generar las fotos a un ritmo sano por detrás.
3. **Cero pérdida de dinero:** Si la IA falla en la sombra, reembolsa los créditos limpiamente sin depender de que el navegador del usuario siga abierto.
