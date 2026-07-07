# PROTOCOLO ESPECÍFICO DEL PROYECTO: AVENTURIA
Estas reglas aplican EXCLUSIVAMENTE a este espacio de trabajo (f:\Proyectos Antigravity\Aventuria 1.5) 
y deben cumplirse en TODOS los turnos, independientemente de la urgencia del usuario.

**JERARQUÍA DE REGLAS:** En caso de fricción o solapamiento con las directrices globales del 
sistema, las reglas de este protocolo local tienen prioridad absoluta.

## 1. DEPLOY LOCK (BLOQUEO DE DESPLIEGUE A PRODUCCIÓN)
- Todo el trabajo se realiza en la rama `develop` (conectada a Vercel Preview Deployment). 
  TERMINANTEMENTE PROHIBIDO hacer merge o push de `develop` a `main` sin confirmación explícita 
  de Mauro en ese turno concreto. Sin excepciones de urgencia, sin excepciones de "cambio menor".
- Antes de proponer el merge a `main`, ejecuta `npm run build` localmente. Si hay errores, DETENTE 
  y repórtalos textualmente a Mauro. Prohibido proponer el merge con errores de build.

## 2. SQL LOCK (BLOQUEO DE SCRIPTS DE BASE DE DATOS)
- `CHANGELOG_DB.md` (raíz del proyecto) es la fuente de verdad sobre qué scripts de 
  `scripts/db_migrations/` están vigentes en producción. Antes de ejecutar cualquier script 
  contra la base de datos, consúltalo primero.
- TERMINANTEMENTE PROHIBIDO ejecutar cualquier script marcado como `⚠️ Incierto` en 
  `CHANGELOG_DB.md` sin confirmación explícita de Mauro, aunque parezca relacionado con la 
  tarea que estás resolviendo. Si Mauro te pide algo que razonablemente requeriría uno de estos 
  scripts, DETENTE y pregúntale directamente antes de ejecutarlo.
- Tras aplicar cualquier script nuevo (no listado aún) contra producción, añade obligatoriamente 
  una fila a `CHANGELOG_DB.md` con la fecha del sistema, el nombre exacto del script, descripción 
  del cambio, y estado `Aplicado en prod`. Nunca rompas el formato Markdown de la tabla.
- PROTECCIÓN GUEST-FIRST: Prohibido tratar como huérfanos, basura o candidatos a limpieza los 
  registros con `user_id IS NULL`. Son datos legítimos de usuarios invitados. Cualquier operación 
  de limpieza o borrado masivo de base de datos debe excluir explícitamente estos registros, salvo 
  instrucción explícita de Mauro identificando por ID exacto qué registros concretos borrar.

## 3. HUMAN-IN-THE-LOOP LOCK (SALVAGUARDA PEDAGÓGICA)
- El estado `isEditing` (`hooks/useGameState.ts`) y su interfaz en `GameScreen.tsx` son el 
  mecanismo central que impide que contenido generado por IA se comparta con un alumno sin 
  validación manual.
- Prohibido modificar esta lógica de forma que el contenido pueda publicarse o compartirse 
  saltándose el modo de validación, aunque la petición de Mauro no mencione explícitamente esta 
  salvaguarda. Si una tarea pedida por Mauro requeriría debilitar o rodear este mecanismo, DETENTE 
  y adviértele explícitamente antes de tocar ese código.

## 4. CERO HUMO
- Prohibido inventar o asumir lógica de negocio, reglas pedagógicas, criterios de "reconducción" 
  de contenido sensible, o métricas (uptime, rendimiento, adopción) que Mauro no haya validado 
  explícitamente ni estén medidas de verdad. Si falta un dato o un criterio, pregunta antes de 
  escribirlo en código o en documentación.

## 5. GESTIÓN DE DESECHOS (ARCHIVOS Y SCRIPTS DE UN SOLO USO)
- Cualquier archivo que crees exclusivamente para una prueba puntual, depuración temporal o 
  verificación rápida (scripts de un solo uso, componentes de prueba, SQL para comprobar algo) 
  debe crearse directamente dentro de una carpeta `_scratch/` en la raíz del proyecto. Nunca lo 
  mezcles con carpetas de código o migraciones en producción (`scripts/db_migrations/`, `src/`, etc.).
- Si tienes dudas sobre si algo es "de un solo uso" o "permanente", trátalo como permanente y 
  pregunta a Mauro antes de meterlo en `_scratch/`. Nunca asumas por tu cuenta que algo es desechable.
- PROHIBIDO borrar (`rm`, `git rm`, o equivalente) cualquier archivo, esté donde esté, sin 
  confirmación explícita de Mauro para ese archivo o lote concreto. Esto aplica también dentro 
  de `_scratch/`.
- Al finalizar una tarea, si quedan archivos en `_scratch/` que ya no son necesarios, no los 
  borres — díselo a Mauro explícitamente ("estos N archivos de `_scratch/` ya no hacen falta, 
  ¿los borro?") y espera su confirmación antes de tocarlos.
