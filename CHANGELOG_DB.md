# Registro de Cambios de Base de Datos (Supabase)

*Este documento consolida la deuda técnica de los scripts `.sql` ejecutados manualmente. A partir de ahora, cualquier cambio en la base de datos debe registrarse aquí de forma estricta.*

| Fecha (Mod.) | Script | Descripción / Propósito | Estado |
| :--- | :--- | :--- | :--- |
| **19 Dic 2025** | `supabase_setup.sql` | Configuración inicial y creación de tablas base. | ✅ Aplicado en prod (Evidencia: Tablas funcionales) |
| **20 Dic 2025** | `update_schema_v2.sql` | Actualización incremental del esquema. | ✅ Aplicado en prod |
| **20 Dic 2025** | `update_schema_v3.sql` | Actualización incremental del esquema. | ✅ Aplicado en prod |
| **20 Dic 2025** | `update_schema_delete_policy.sql` | Políticas de borrado en cascada / RLS. | ✅ Aplicado en prod |
| **20 Dic 2025** | `update_schema_trends.sql` | Esquema para funcionalidad de tendencias. | ✅ Aplicado en prod |
| **20 Dic 2025** | `update_schema_quota.sql` | Control de cuotas de uso. | ✅ Aplicado en prod |
| **20 Dic 2025** | `update_storage_bucket.sql` | Setup del storage de imágenes. | ✅ Aplicado en prod |
| **20 Dic 2025** | `update_schema_combined.sql` | Script combinado de consolidación. | ✅ Aplicado en prod |
| **21 Dic 2025** | `fix_permissions.sql` | Corrección temprana de RLS. | ⚠️ Incierto (Probablemente sobreescrito) |
| **21 Dic 2025** | `fix_all_db_issues.sql` | Parche masivo de RLS/permisos. | ⚠️ Incierto (Probablemente sobreescrito) |
| **21 Dic 2025** | `fix_permissions_final.sql` | Parche final de permisos (versión 21 Dic). | ⚠️ Incierto (Probablemente sobreescrito) |
| **22 Dic 2025** | `secure_rpc_setup.sql` | Setup de Stored Procedures (RPCs) seguros. | ✅ Aplicado en prod |
| **22 Dic 2025** | `update_admin_rpcs.txt` | Funciones RPC para panel de administración. | ✅ Aplicado en prod |
| **22 Dic 2025** | `update_admin_rpcs_v2.txt` | Evolución de funciones RPC admin. | ✅ Aplicado en prod |
| **22 Dic 2025** | `update_admin_full_v3.txt` | Versión final RPC admin (Analíticas). | ✅ Aplicado en prod (Evidencia: Project Bible) |
| **22 Dic 2025** | `update_schema_auth_sessions.txt` | Modificaciones a la tabla/esquema de sesiones. | ⚠️ Incierto |
| **22 Dic 2025** | `restore_db_v2.sql` | Volcado/Backup de BD. | ⚠️ Incierto (Uso manual puntual) |
| **22 Dic 2025** | `restore_part1_adventures.sql` | Volcado tabla aventuras. | ⚠️ Incierto (Uso manual puntual) |
| **22 Dic 2025** | `restore_part2_stats.sql` | Volcado tabla estadísticas. | ⚠️ Incierto (Uso manual puntual) |
| **22 Dic 2025** | `restore_part3_storage.sql` | Volcado registros storage. | ⚠️ Incierto (Uso manual puntual) |
| **22 Dic 2025** | `restore_micro_1_read.sql` | Volcado parcial. | ⚠️ Incierto (Uso manual puntual) |
| **23 Dic 2025** | `update_first_score.sql` | Lógica de retención de la primera puntuación. | ✅ Aplicado en prod (Evidencia: Project Bible) |
| **23 Dic 2025** | `fix_sessions_permissions.txt` | Parche RLS de sesiones. | ⚠️ Incierto |
| **23 Dic 2025** | `fix_leaderboard_rls.txt` | Políticas de lectura para Leaderboard público. | ✅ Aplicado en prod |
| **24 Dic 2025** | `fix_visibility.sql.txt` | Ajuste de visibilidad/índices. | ✅ Aplicado en prod |
| **24 Dic 2025** | `fix_performance.sql.txt` | Ajuste de rendimiento BD. | ✅ Aplicado en prod |
| **24 Dic 2025** | `fix_adventures_rls.txt` | Ajustes RLS aventuras. | ⚠️ Incierto (Sobreescrito por día 26) |
| **26 Dic 2025** | `fix_public_sharing.txt` | Políticas RLS para enlaces compartidos. | ✅ Aplicado en prod (Evidencia: Guest Mode) |
| **26 Dic 2025** | `fix_anonymous_updates.txt` | Permite UPDATE a usuarios anónimos (user_id IS NULL). | ✅ Aplicado en prod (Evidencia: Código verificado) |
| **26 Dic 2025** | `fix_permissions_final.txt` | Parche definitivo RLS post-Navidad. | ✅ Aplicado en prod |
| **08 Jul 2026** | `20260708_create_profiles_and_wallet.sql` | Creación de tabla profiles, credit_transactions y RPC atomic_spend. | ✅ Aplicado en prod |
| **08 Jul 2026** | `20260708_auth_triggers.sql` | Trigger de creación de perfil y regalo de 50 créditos. | ✅ Aplicado en prod |
| **11 Jul 2026** | `20260711_cron_cleanup_transactions.sql` | Configuración de pg_cron para reembolso automático de créditos en estado pending (5 mins). | ✅ Aplicado en prod |
| **11 Jul 2026** | `20260711_refund_credits.sql` | Función RPC `refund_credits` para reembolso parcial/total de créditos (mecanismo de fallback). | ✅ Aplicado en prod |

---
**Nota Operativa:** Los scripts marcados como "Incierto" no deben volver a ejecutarse ciegamente, ya que pertenecen a fases de iteración pasadas. Las políticas activas actuales están regidas por los scripts del 26 de Diciembre.
