<div align="center">
  <h1>AventurIA</h1>
  <p><strong>Plataforma EdTech de aprendizaje adaptativo gamificado mediante IA.</strong></p>
  <p><em>La IA propone. El humano valida. El alumno aprende.</em></p>
</div>

## 📖 ¿Qué es AventurIA?
Aventuria es una plataforma que permite transformar cualquier tema en una experiencia educativa interactiva. Su objetivo no es automatizar la educación a ciegas, sino facilitar la creación de materiales de calidad, reduciendo el tiempo técnico y manteniendo el criterio pedagógico humano como el centro del proceso.

A diferencia de los generadores automáticos o los wrappers básicos de IA, AventurIA aplica una filosofía **"Human-in-the-Loop"**: ningún contenido se comparte sin la validación del creador (profesor, padre o tutor).

## 🚀 Filosofía de Diseño y Aprendizaje Adaptativo
El sistema está construido sobre pilares pedagógicos sólidos:
- **Responsabilidad Educativa:** La IA adapta el lenguaje a la edad y reconduce temas sensibles hacia enfoques constructivos (ej. transformando un prompt sobre violencia en un juego de resolución de conflictos).
- **Aprender Haciendo:** El error forma parte del proceso y no se penaliza. El sistema registra el primer intento (evaluación diagnóstica) y el mejor intento (dominio de la materia), fomentando la repetición.
- **Fricción Cero:** Los alumnos pueden acceder a las aventuras desde cualquier dispositivo móvil o de escritorio sin necesidad de crear cuentas.

## 🛠️ Arquitectura Técnica y Stack
AventurIA es una aplicación **Fullstack Serverless** en producción, diseñada para ser resiliente y altamente escalable:
- **Frontend:** React 19 + TypeScript + Vite. Interfaz moderna y dinámica utilizando Tailwind CSS y Framer Motion (diseño adaptativo y glassmorphism).
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage).
- **Seguridad y Permisos:** Arquitectura "Guest-First": los usuarios invitados pueden interactuar y guardar progreso sin necesidad de crear cuenta, con el acceso a los datos resuelto a nivel de base de datos (Row Level Security de Supabase).
- **Motor de IA Generativa:** Integración con Google Gemini 2.0 / 2.5 Flash para la generación de contenido, con un sistema de fallback en cascada entre proveedores (Gemini -> Pollinations Flux -> Pollinations Turbo) para minimizar tiempos de espera y caídas de servicio.

## 🗺️ Roadmap de Negocio y Escalabilidad
El desarrollo actual evoluciona desde un producto funcional hacia un modelo SaaS sostenible:
- [ ] **Branding:** Migración inminente a dominio propio comercial.
- [ ] **Monetización (SaaS):** Integración de pasarelas de pago para planes de suscripción.
- [ ] **Optimización de Costes Computacionales:** Implementación de arquitectura *Tiered*. Los usuarios en plan *Free* consumirán recursos de repositorios de imágenes de stock (reduciendo el coste de API a cero en visuales), mientras que la generación generativa en tiempo real quedará reservada para usuarios *Premium*.

## 💻 Desarrollo Local
Si deseas auditar el código localmente:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# (Añade tus credenciales de Google Gemini y Supabase)

# 3. Iniciar el entorno de desarrollo
npm run dev
```

---
*Construido uniendo el criterio pedagógico con la orquestación de tecnología moderna (IA generativa + arquitectura serverless).*
