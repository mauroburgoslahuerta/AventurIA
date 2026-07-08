# AventurIA: Visión SaaS y Economía de Créditos

Este documento define las reglas de negocio, la economía de créditos y los flujos de usuario para la transición de AventurIA hacia un modelo SaaS seguro y monetizable.

## 1. Misión del Producto
Evolucionar de una herramienta educativa a un SaaS profesional, garantizando retención de usuarios ("Product-Led Growth") y protección absoluta contra abusos de la API.

## 2. Economía y Tiers de Usuario

### 2.1. Invitado (Tier 0)
- **Permisos:** Jugar aventuras compartidas y ver resultados.
- **Creación (Modo Stock Obligatorio):** Pueden crear aventuras gratis, pero la IA solo redacta el texto. Las imágenes se extraen obligatoriamente de bancos de imágenes gratuitos (Unsplash/Pexels). Cero coste de IA visual.

### 2.2. Registrado Gratuito (Tier 1)
- **Regalo de Bienvenida:** Recibe **50 Créditos** al registrarse.
- **Coste Estricto por Imagen:** 
  - **Generar:** 10 Créditos por imagen. Si el saldo no alcanza para todas las preguntas solicitadas, se bloquea la acción.
  - **Regenerar (Modo Edición):** Cambiar una foto con IA cuesta **15 Créditos**.
  - **Textos:** Infraestructura gratuita (0 créditos).

### 2.3. Premium / Comprador (Tier 2 - Futuro)
- Compra de paquetes de créditos puntuales o suscripciones (Stripe).

## 3. Seguridad y Transparencia ("Zero-Theft Policy")

1. **Cobros Seguros (Atomicidad):** El servidor descuenta los créditos de forma matemática. Si el usuario no tiene saldo, la operación se rechaza atómicamente antes de enviar nada a la IA.
2. **Reembolsos Parciales y Transparencia (Stock Fallback):** 
   - Si un usuario pide 5 imágenes y la IA falla en 2, el sistema devuelve 20 créditos automáticamente.
   - Esas 2 imágenes fallidas se rellenan con imágenes de banco gratuitas. Para no confundir al usuario, la interfaz marcará visualmente esas fotos (ej. "Imagen de archivo. La IA estaba saturada y no te hemos cobrado esta foto").
   - El usuario podrá, en cualquier momento, usar sus créditos devueltos para volver a intentar generar esa foto con IA usando el botón de Regenerar.
3. **El Fallback del Fallback (Protección Absoluta):** Si la IA cae, y la API de imágenes gratuitas (Pexels) también cae, el sistema inyectará una imagen estática genérica precargada en el servidor (ej. un vector de "AventurIA"). Nunca entregaremos un quiz roto o sin imagen.
4. **Historial de Gastos (Ledger):** Registro inmutable para soporte al cliente.
