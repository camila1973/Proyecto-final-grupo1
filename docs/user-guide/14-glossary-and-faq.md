# 14. Glosario y preguntas frecuentes

## 14.1. Glosario

### Generales

- **TravelHub** — Marketplace de alojamientos turísticos que conecta viajeros
  con hoteles, hostales y agencias.
- **Frontend (web)** — Aplicación accesible desde el navegador. La usan
  tanto viajeros como partners.
- **App móvil** — Aplicación nativa para iOS y Android, pensada para
  viajeros. Es donde está el check-in con QR.

### Usuarios y roles

- **Invitado** — Usuario no autenticado; puede explorar pero no reservar.
- **Viajero (guest)** — Usuario registrado que reserva alojamientos.
- **Partner** — Organización hotelera que pone alojamientos a la venta.
- **Usuario partner** — Persona física que accede al portal "Mi Hotel"
  por cuenta del partner.
- **Manager** — Usuario partner asignado a una propiedad específica
  (parcialmente implementado).
- **Administrador (admin)** — Personal interno de TravelHub.

### Reservas

- **Reserva (Reservation)** — Acuerdo entre viajero y hotel para usar una
  habitación en unas fechas.
- **Hold** — Estado inicial de 15 minutos en que la habitación queda
  bloqueada para que el viajero complete el pago.
- **Held / Submitted / Confirmed / etc.** — Estados de la reserva. Ver el
  capítulo 3 para el detalle completo.
- **No-show** — El viajero no se presentó. Tras la fecha de check-in sin
  registrar entrada, la reserva pasa a `no_show` automáticamente.
- **Partner-cancel** — Cancelación iniciada por el hotelero (solo sobre
  reservas confirmadas).

### Propiedad e inventario

- **Propiedad (Property)** — Un hotel, hostal o alojamiento concreto.
  Pertenece a un partner.
- **Room type (tipo de habitación)** — Categoría de habitación dentro de
  una propiedad (ej. "Suite con vista al mar"). Tiene varias unidades
  físicas pero se gestiona como un único agregado.
- **Rate Plan** — Configuración de precios por noche del room type.
- **Block** — Fecha en la que un room type no está a la venta (por
  mantenimiento, evento, etc.).
- **Amenities** — Servicios y comodidades (WiFi, piscina, gym, etc.).

### Pagos y finanzas

- **Stripe** — Procesador de pagos usado por TravelHub.
- **Hold de pago** — Bloqueo temporal del importe en la tarjeta del
  viajero. En TravelHub el cobro ocurre al confirmar el pago, no antes.
- **Refund (reembolso)** — Devolución al viajero por cancelación o disputa.
- **Disbursement (desembolso)** — Transferencia que TravelHub hace al
  partner como liquidación.
- **Comisión** — Porcentaje que TravelHub retiene en cada reserva.
- **ADR** — Average Daily Rate. Ingreso medio por noche vendida.
- **Ocupación** — Noches vendidas / noches disponibles.

### Integraciones

- **PMS (Property Management System)** — Sistema interno del hotel para
  gestionar reservas, habitaciones, tarifas. Hotelbeds, TravelClick,
  RoomRaccoon son ejemplos.
- **Webhook** — Notificación automática que un sistema externo envía a
  TravelHub cuando algo cambia (nueva habitación, nueva tarifa, etc.).
- **Bulk import (CSV)** — Carga masiva de inventario mediante archivo CSV.

### Seguridad

- **JWT (JSON Web Token)** — Token de sesión emitido tras iniciar sesión.
- **MFA (Multi-Factor Authentication)** — Autenticación en dos pasos. El
  viajero o partner puede activarla para mayor seguridad.

### Notificaciones

- **Email transaccional** — Emails automáticos enviados por eventos del
  sistema (reserva confirmada, cancelada, check-out completado, etc.).

## 14.2. Preguntas frecuentes — Viajero

**¿Necesito una cuenta para buscar?**
No. La búsqueda y el detalle de propiedad son accesibles sin iniciar sesión.
Solo necesitas cuenta para reservar.

**¿Cómo cambio el idioma o la divisa?**
Desde el selector en el encabezado (web) o en Ajustes (móvil). Se aplica al
instante.

**¿Puedo reservar para alguien más?**
Sí, pero la reserva queda a tu nombre. Si necesitas que aparezca otro nombre
como huésped principal, indícalo en el campo correspondiente del checkout.

**¿Qué pasa con mis datos de tarjeta?**
Nunca se almacenan en TravelHub. Stripe los tokeniza directamente.

**Me llegó dos veces el cargo, ¿qué hago?**
Verifica primero en "Mis Reservas" si hay dos reservas. Si tu banco refleja
dos cargos pero solo hay una reserva, contacta soporte con los datos.

**¿Puedo modificar fechas?**
Hoy no hay un flujo automatizado para modificar fechas. Lo recomendable es
cancelar y crear una nueva reserva, o contactar directamente con el hotel.

**¿Funciona en mi país?**
TravelHub está disponible globalmente, con propiedades en distintos países.
Los precios se cobran en USD; tu banco aplica el tipo de cambio.

## 14.3. Preguntas frecuentes — Partner

**¿Puedo dar de alta propiedades sin ayuda?**
Hoy, el alta inicial de propiedades se gestiona con el equipo de TravelHub.
Una vez creadas, la gestión es self-service.

**¿Puedo asignar gerentes a propiedades?**
La estructura existe (rol manager), pero la asignación todavía no está
totalmente operativa en la UI. Avanzará en próximas iteraciones.

**¿TravelHub me envía clientes nuevos o solo gestiona los míos?**
TravelHub funciona como **canal de venta**: cualquier viajero registrado
puede encontrarte si tu propiedad coincide con su búsqueda. Es un canal
adicional, no solo gestión.

**¿Qué comisión cobra TravelHub?**
Depende del contrato con cada partner. La comisión aplicada se muestra en
el detalle de cada pago.

**¿Puedo bloquear fechas si tengo evento privado?**
Sí. Ve a la habitación → tarjeta "Blocks" → añade un bloqueo con el rango
de fechas. Esas fechas dejan de aparecer en los resultados de búsqueda al
instante.

**¿Cómo funciona el QR?**
Cada propiedad tiene su clave única. El QR se genera desde "Editar
propiedad → QR" y se imprime una vez. Los huéspedes lo escanean con la app
para hacer check-in.

**¿Y si tengo overbooking accidental?**
Usa partner-cancel sobre la reserva más reciente y coordina con soporte el
reembolso al viajero afectado. La causa raíz suele ser desincronización
con el PMS; revisa la fuente.

**¿Cómo se reflejan los reembolsos en mis desembolsos?**
Los reembolsos restan del próximo desembolso. Verás el detalle en la
sección Desembolsos al expandir cada liquidación.

## 14.4. Preguntas frecuentes — Corporativo / no técnico

**¿En qué se diferencia TravelHub de otros marketplaces como Booking?**
TravelHub combina marketplace + portal de gestión hotelera + integraciones
PMS en una única plataforma. Los hoteles no solo reciben reservas: también
gestionan inventario, tarifas, finanzas y reportes desde el mismo sitio.

**¿En qué países opera?**
Globalmente, con propiedades en múltiples países. El cobro es en USD por
defecto, con visualización multi-divisa para el viajero.

**¿Es self-service para el hotel?**
Mayormente sí, una vez activada la cuenta. El alta inicial de propiedades
puede requerir apoyo del equipo de TravelHub, especialmente si se integra
con un PMS.

**¿Quién valida la información de los hoteles?**
El proceso de validación se realiza en el alta del partner; tras esa
validación, el partner gestiona contenido (fotos, descripciones, tarifas)
con autonomía.

**¿Quién atiende soporte?**
El equipo interno de TravelHub atiende tanto viajeros como partners. El
canal habitual es email; los tickets críticos pueden escalar a llamada.

**¿La plataforma cumple con GDPR / LGPD?**
Las funciones básicas (consentimiento, derecho de eliminación, exportación
de datos) están incluidas en el flujo de registro y la gestión de cuenta.
