# 5. Funcionalidades para el administrador

El **administrador** es personal interno de TravelHub. No es un rol de
auto-servicio: lo crea el equipo operativo manualmente.

## 5.1. Alcance del rol

El administrador tiene acceso transversal a toda la plataforma. En la
práctica, opera la aplicación como si fuera **viajero y partner al mismo
tiempo**, sin las restricciones de pertenencia a un partner concreto.

Casos típicos de uso:

- **Soporte de primer nivel** — investigar una reserva, ver el estado de un
  pago, contestar una disputa.
- **Operación** — corregir datos puntuales, desbloquear cuentas, gestionar
  altas de partners.
- **Auditoría** — revisar movimientos, transiciones de reserva, integridad
  de inventario.
- **Pruebas internas** — el seed precarga un usuario `admin@travelhub.com`
  para que el equipo pruebe escenarios de extremo a extremo.

## 5.2. ¿Tiene un panel separado?

**No.** A día de hoy, el administrador usa la misma interfaz web que el resto
de usuarios — sus permisos elevados se aplican automáticamente cuando consume
los endpoints de la plataforma.

Esto significa que un admin puede, por ejemplo:

- Buscar y reservar (como viajero).
- Entrar en "Mi Hotel" (con un partner asociado para pruebas).
- Acceder a datos de cualquier partner si la operación lo requiere
  (a través de herramientas internas y/o API directa).

## 5.3. Buenas prácticas para administradores

- **Trazabilidad** — cualquier acción del admin queda registrada en el
  audit trail de reservas y pagos. Documenta siempre el motivo en la
  herramienta interna (ticket, incidencia).
- **MFA obligatorio recomendado** — la cuenta admin debe tener MFA activo;
  un admin comprometido es un riesgo crítico.
- **Mínimo privilegio** — no usar admin para tareas que un partner pueda
  resolver desde su propio portal. El admin existe para **excepciones**.
- **No tocar datos sin solicitud** — TravelHub guarda historial; cualquier
  ajuste a una reserva o pago debe responder a una petición trazable.

## 5.4. Roadmap (no incluido aún)

Funcionalidades que probablemente vivirán en un panel admin dedicado a
futuro:

- Gestión centralizada de partners (alta, suspensión).
- Vista global de incidencias y disputas.
- Reportes ejecutivos cross-partner (volumen, churn, conversión).
- Configuración de políticas globales (cancelación por defecto, fees del
  marketplace, etc.).
- Cola de moderación de contenidos (fotos, descripciones).

Estas funcionalidades aún **no están implementadas** y se gestionan de forma
manual o vía base de datos / API.
