# Biblia del Proyecto: Aventuria (Sistema de Generación de Quizzes Educativos con IA)

**Versión del Documento:** 1.5
**Fecha de Actualización:** 18 de Enero, 2026

**Estado:** PRODUCCIÓN / STABLE

---

## 1. Identidad y Visión del Producto

### Manifesto del Proyecto
Aventuria democratiza la creación de material educativo interactivo. Nuestra filosofía se basa en el **"Aprendizaje Adaptativo Instantáneo"**: cualquier tema, por complejo o nicho que sea, puede transformarse en segundos en una experiencia lúdica, visualmente atractiva y pedagógicamente sólida.

### Propuesta de Valor Única
La superioridad de Aventuria frente a un quiz tradicional (Kahoot/Quizizz) radica en su **Motor Generativo Contextual**:
*   **Tradicional:** Requiere redacción manual y búsqueda de imágenes (1-2 horas).
*   **Aventuria:** El usuario solo define "Tema" + "Audiencia". La IA asume el rol de diseñador instruccional, adapta el vocabulario, y genera arte conceptual (sin spoilers) en <30 segundos.

### Perfiles de Usuario (Personas)
1.  **El Creador (The Architect):** Profesor o Padre. Configura la aventura, cura el contenido (Modo Edición) y monitoriza el progreso mediante analíticas detalladas en su Perfil.
2.  **El Jugador (The Explorer):** Alumno o Hijo. Juega desde cualquier dispositivo (móvil/desktop) sin necesidad de registro, obteniendo feedback inmediato.

### Casos de Uso
*   **Aula Invertida:** Micro-evaluación rápida al inicio de clase.
*   **Refuerzo en Casa:** Cuentos interactivos personalizados.
*   **Trivia Social:** Retos virales compartidos por WhatsApp.

---

## 2. Arquitectura de Software

### Stack Tecnológico
*   **Frontend:** React 19 + Vite + TypeScript.
*   **Estilos:** Tailwind CSS + Framer Motion (Animaciones complejas).
*   **Backend/BaaS:** Supabase (Auth, Postgres DB, Storage, RLS Policies).
*   **IA:** Google Gemini 2.0 Flash (Texto) + Gemini 2.5 Flash / Pollinations (Imagen).
*   **Deploy:** Vercel (Frontend & Serverless Functions).

### 2.5. Características Clave de Ingeniería
*   **Lazy Persistence ("Generación Bajo Demanda"):** Las imágenes se generan y almacenan solo cuando es necesario, optimizando costes y almacenamiento.
*   **Fail Open ("Resiliencia"):** El sistema permite jugar incluso si el contador de cuotas o servicios secundarios fallan.
*   **Edición Viva:** El creador puede modificar preguntas (`isEditing`) en tiempo real, corrigiendo alucinaciones de la IA antes de compartir.
*   **Permissions Agnostic:** Arquitectura diseñada para soportar "Guest Mode" total. Un usuario anónimo puede contribuir datos (scores) a una aventura sin ser su dueño.

---

## 3. Modelo de Datos y Persistencia

### Esquema de Base de Datos (Supabase)
1.  **`adventures`:** Tabla core.
    *   `user_id`: UUID (Nullable). Si es `NULL`, es una aventura "huérfana" (creada por invitado).
    *   `config`: JSONB `{ topic, audience, difficulty, timerSeconds }`.
    *   `questions`: JSONB (Array de preguntas + metadatos de imagen).
    *   `is_featured`: Boolean (Para carrusel de destacados).
2.  **`game_sessions`:** Historial de partidas.
    *   `adventure_id`: FK.
    *   `score`, `first_score`: Métricas de rendimiento.
    *   `player_alias`: Nombre del jugador (o "Anónimo").
    *   `played_at`: Timestamp.

### Flujo de Datos
1.  **AI Gen:** Prompt -> JSON -> Frontend State.
2.  **Persistence:** LocalStorage (State) -> Supabase (Solo al Compartir/Guardar).
3.  **Analytics:** Cada partida finalizada inserta en `game_sessions` y actualiza contadores atómicos en `adventures`.

---

## 4. El Motor de IA (La "Caja Negra" Explicada)

### 4.2. Prompt Engineering & "Creative Reframing"
*   **Filosofía "No Censura, Sí Educación":** A diferencia de modelos que simplemente bloquean temas difíciles, AventurIA aplica una capa de transformación.
    *   *Código:* `Temas INADECUADOS... NO uses el bloqueo estándar. REFORMULA hacia una vertiente educativa.`
    *   *Resultado:* El sistema transforma "Violencia" en "Resolución de Conflictos" o "Robar" en "Ética y Leyes". Convierte el morbo en aprendizaje.

### 4.3. Alineación Curricular (Conocimiento Latente)
Una ventaja competitiva clave es que **no** dependemos de bases de datos curriculares obsoletas.
*   **Lógica:** Al instruir a la IA como "Diseñador Instruccional", utilizamos su **conocimiento latente** masivo. Gemini "sabe" qué vocabulario y conceptos corresponden a un niño de 8 años en Perú vs. España sin necesidad de tablas de consulta.
*   **Adaptación Dinámica:**
    *   **Fácil (Bloom: Recordar):** Conceptos directos.
    *   **Medio (Bloom: Aplicar):** Distractores plausibles.
    *   **Difícil (Bloom: Evaluar):** Pensamiento crítico.

### 4.4. Generación de Imágenes (Triple Fallback Strategy)
Estrategia de ingeniería para garantizar disponibilidad 99.9% (`hooks/useGameGen.ts`). No es pedagógica, es pure **Resiliencia Operativa**:
1.  **Nivel 1 (Primary):** **Google Gemini 2.5 Flash**. Máxima coherencia semántica con el prompt educativo.
2.  **Nivel 2 (Fallback):** **Pollinations AI (Flux)**. Calidad artística superior y gratuita. Se activa automáticamente si Gemini falla o agota cuota.
3.  **Nivel 3 (Last Resort):** **Pollinations Turbo**. Prioridad absoluta a la velocidad (<2s) para evitar que un alumno se quede mirando una pantalla de carga.

---

## 5. Lógica de Negocio y Algoritmos

### Sistema de Puntuación Dual
*   **`first_score`**: La nota del primer intento. Inmutable. Refleja el conocimiento real.
*   **`score` (Best Score)**: La mejor nota histórica. Incentiva la rejugabilidad y el dominio ("Mastery").

### Analíticas Avanzadas (Nuevo en V1.5)
El `ProfileScreen` incluye un potente modal de análisis:
*   **Ranking Detallado:** Lista de todas las sesiones de una aventura.
*   **Sorting:** Ordenar por Alias, Mejor Puntuación o Fecha.
*   **Gestión:** El creador puede borrar registros de partidas individuales (ej. pruebas o spam).

---

## 6. UX/UI y Diseño de Interfaz

### Identidad Visual
El sistema utiliza un diseño de alto contraste y energía:
*   **Fondo Global:** Gradiente Vibrante **Electric Blue / Cyberpunk** (`linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)`). Transmite energía, modernidad y foco.
*   **Contenedores:** **Glassmorphism Profundo**. Las tarjetas de contenido flotan sobre el azul eléctrico, optimizando la legibilidad con un toque moderno.
### Componentes Clave
*   **Setup Screen:**
    *   Header con Logo "AventurIA" + Badges (**BETA V1.5**, **En App**).
    *   **Mobile FAB:** Botón flotante animado para acceder a "Aventuras Destacadas" en móviles.
*   **Profile Screen:**
    *   Gestión de Biblioteca ("Mis Aventuras").
    *   **Bulk Actions:** Selección múltiple para borrado masivo.
    *   **Quick Share:** Copiar enlace directo desde la tarjeta.
*   **Summary Screen:**
    *   **Precision Ring:** Gráfico circular SVG para el % de aciertos.
    *   **Streak Ring:** Indicador visual de racha máxima.
    *   **Opciones de Compartir:** Link, WhatsApp (Nativo) y **Descargar HTML** (Offline backup).

---

## 7. Infraestructura y Permisos (Fix V1.5)

### Políticas de Acceso (RLS & Guest Mode)
Se ha implementado una arquitectura de permisos "Guest-First":
*   **Anonymous Logic:** La base de datos permite `INSERT` y `UPDATE` en `adventures` donde `user_id IS NULL`.
*   **Resultado:** Un usuario sin cuenta puede crear una aventura, jugarla, y **compartirla**. La aventura existe en la BD como "huérfana" pero funcional.
*   **Conversión (Soft Wall):** El sistema sugiere registrarse (`Login Nudge`) al crear, pero permite "Continuar sin guardar". El enlace de compartir final funciona para todos.

---

## 8. Estado Actual y Deuda Técnica

### Roadmap Inmediato
1.  **Caché de Imágenes:** Implementar almacenamiento definitivo en bucket `adventure_images` para evitar regeneración (coste).
2.  **Exportación PDF:** Solicitud frecuente de profesores para uso offline en aula.
3.  **Optimizaciones Móviles:** Refinar el comportamiento del teclado virtual en el `StartScreen` para evitar saltos de layout.

---
**Fin del Documento Confidencial**
