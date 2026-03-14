Universidad de Los Andes

Departamento de Ingeniería de Sistemas y Computación Maestría en
Ingeniería de Software -- MISO

TravelHub Transformación Digital de la Plataforma de Reservas Hoteleras

MISW4501 - Proyecto Final

2026-11 y 2026-12

El proyecto del curso tiene como objetivo poner en práctica la mayor
cantidad de conocimientos y habilidades aprendidos durante la maestría.
Este enunciado de proyecto servirá para diseñar y construir el producto
final de cierre de la maestría que contempla tanto el Proyecto I
(MISW-4501) como el Proyecto II (MISW-4502). TravelHub TravelHub:
Transformación Digital de la Plataforma de Reservas Hoteleras TravelHub
es una empresa de tecnología de viajes con presencia en 6 países de
Latinoamérica (Colombia, Perú, Ecuador, México, Chile y Argentina), que
opera una plataforma digital de reservas de hospedaje y tours,
conectando a hoteles, hostales, operadores turísticos, agencias de viaje
y viajeros finales. Las siguientes cifras describen el comportamiento
actual de transacciones e ingresos de TravelHub. Estadísticas
Operacionales Actuales (USD) Métrica Valor Reservas procesadas
mensualmente \~18,000 Valor promedio por reserva \~\$240 Hoteles y
hospedajes asociados \~1,200 Ingresos promedio mensuales \~\$4.3
millones Viajeros registrados activos \~450,000 Agencias de viaje
asociadas \~350 Operadores turísticos \~180 Ingresos anuales proyectados
\~\$51.6 millones

Modelo de Negocio y Procesos Actuales 1. Gestión de Inventario Hotelero
El área de Inventario de TravelHub es responsable de mantener la
información actualizada de habitaciones, tarifas, disponibilidad y
políticas de cancelación de cerca de 1,200 propiedades hoteleras. El
equipo maneja integraciones con sistemas de gestión hotelera (P roperty
Management Systems - PMS) de diferentes proveedores, cada uno con sus
propias APIs y formatos de datos. Características actuales: •
Actualización de disponibilidad: 2-3 veces por día (procesamiento por
lotes) • Manejo de 8,000-12,000 SKUs de habitaciones (tipo, categoría,
tarifa dinámica) • Integraciones manuales y semi-automáticas con 15+
proveedores de PMS • Sincronización de tarifas en múltiples monedas
(USD, ARS, CLP, PEN, COP, MXN)

• Retrasos en la actualización generan sobreventa (overbooking) o
subutilización 2. Proceso de Búsqueda y Reserva Los viajeros finales,
agencias de viaje y operadores turísticos interactúan con la plataforma
web y móvil para buscar, comparar y reservar hospedaje. El sistema debe
manejar búsquedas complejas combinando ubicación, fechas, capacidad,
amenidades y rango de precio, mientras mantiene consistencia con el
inventario actual. Características actuales: • Búsquedas toman 3-5
segundos en promedio • Base de datos centralizada en un único servidor
(cuellos de botella) • Bloqueos frecuentes entre transacciones de
reserva y actualización de inventario • Sistema de pago acoplado al
motor de reserva (fallos en pagos afectan toda la plataforma) • 25-30%
de carritos abandonados por tiempos de respuesta lentos 3. Pagos y
Facturación TravelHub procesa pagos en 6 monedas diferentes a través de
múltiples proveedores de pago (Stripe, Mercado Pago, OpenPay, Paypal,
etc). Cada transacción debe ser validada, reconciliada con los hoteles y
auditada para fines de cumplimiento regulatorio en cada país. Problemas
identificados: • Pérdidas anuales por fraude: USD\$180,000
(falsificación de tarjetas, duplicación de transacciones) • Tiempo de
reconciliación: 5-7 días (impacta tesorería y confianza del hotel) •
Falta de encriptación end-to-end en transmisión de datos de tarjeta • No
cumple con estándares PCI-DSS 3.2.1 en todos los países • 12% de
transacciones rechazadas sin motivo claro (falsa declinación) 4.
Operaciones y Servicio al Cliente El equipo de operaciones gestiona
cambios, cancelaciones, disputas y reclamaciones. Los hoteles y clientes
interactúan con el sistema a través de portales web separados, sin
visibilidad centralizada del estado de la reserva. Problemas
identificados: • Falta de API única para cambios de reserva (hoteles
deben llamar por teléfono) • Sistema de tickets manual en Jira (no
integrado con plataforma principal) • Tiempos de respuesta a cambios:
4-8 horas • 15% de cancelaciones rechazadas incorrectamente por
inconsistencias de datos Problemas Reportados por los Stakeholders Sobre
la Experiencia de Usuario y Conversión Laura Fernández, Gerente de
Producto y Crecimiento, compartió una preocupación crítica durante las
sesiones de diagnóstico: "Nuestras métricas de analytics muestran que el
25 -30% de los usuarios abandona el carrito antes de completar la
reserva. Cuando analizamos los logs de sesión, encontramos que muchos
abandonos ocurren justo después de la búsqueda. Competidores como
Booking y Airbnb muestran resultados en menos de un segundo; nosotros
tardamos 3 a 5 segundos. Los usuarios simplemente se van a otro sitio .
Además, cuando un cliente quiere revisar una reserva anterior, el

sistema tarda 6 a 8 segundos en cargar el histórico. Para una plataforma
que vende experiencias, esto es inaceptable." Esta situación ha tenido
impacto directo en los ingresos. María González, Directora General,
agregó: "Hemos dejado de capturar aproximadamente USD\$300,000 anuales
por estos abandonos. Si mejoramos los tiempos de respuesta, podríamos
recuperar al menos parte de e se dinero. Nuestro objetivo es reducir los
abandonos al 8-10% este año." Sobre la Confiabilidad Operacional durante
Temporadas Altas Roberto Díaz, Responsable de Infraestructura y DevOps,
describió un escenario recurrente: "Durante la Semana Santa, Navidad y
períodos vacacionales, el sistema simplemente no aguanta la carga. La
base de datos llega al 85% de CPU entre las 7 y 9 de la noch e, cuando
los clientes están buscando desde casa. Nos vemos forzados a redirigir
tráfico o rechazar peticiones. En las últimas dos temporadas altas,
tuvimos rechazos del 35-40% de peticiones durante 2-3 horas. Los hoteles
nos reclaman porque sus reservas no se procesan. Es un ciclo predecible
y no sabemos cómo escalarlo sin invertir millones en infraestructura."
Carlos Mendoza, VP de Tecnología y Operaciones, agregó su perspectiva:
"Tenemos una arquitectura que fue diseñada hace 5 años para procesar 50
reservas por minuto. Hoy necesitamos 150 -200 en promedio, con picos de
400. Si crecemos al 30% anual como proyect amos, en 18 meses el sistema
será completamente insostenible. Hemos hecho parches, pero la deuda
técnica es enorme." Sobre la Fragmentación de Datos y Coordinación entre
Áreas Miguel Torres, Gerente de Hoteles Partners, expresó una
frustración común: "Tenemos 1,200 hoteles asociados. Cada uno usa un
sistema diferente (PMS) para gestionar sus habitaciones y tarifas.
Nosotros integramos manualmente o con scripts que se ejecutan ca da 2-3
horas. El resultado es que a veces les vendemos habitaciones que ya
están ocupadas, y otras veces no sabemos que tienen ofertas especiales
disponibles. He recibido quejas de hoteles diciendo que TravelHub
sobrevende, luego se ven forzados a rechazar nuestras reservas o
incumplen con los clientes. Esto daña nuestra relación con partners."
Sandra López, de Servicio al Cliente, añadió: "Recibimos 50 -80 tickets
diarios sobre inconsistencias. Un cliente reserva, pero el hotel dice
que la habitación no existe. O un viajero intenta cambiar fechas y el
sistema lo rechaza sin motivo claro. Nuestro equipo tiene que resolver
esto manualmente, muchas veces llamando al hotel por teléfono. Los
tiempos de resolución son de 4 a 8 horas, cuando deberían ser minutos.
Es un trabajo que debería ser automatizado." Sobre la Confianza y
Seguridad en Pagos Javier Ríos, Responsable de Cumplimiento y Seguridad,
elevó la alarma sobre un riesgo crítico: "Descubrimos que durante la
pandemia, algunos datos de tarjeta de crédito se almacenaban en texto
plano en nuestra base de datos. No cumplíamos con PCI -DSS 3.2.1. Hemos
tenido tres incidentes de seguridad en los últimos 18 meses: uno fue
robo de credenciales administrativas, otro fue un ataque
man-in-the-middle interceptando datos de tarjeta. Afortunadamente no
hubo fraude masivo, pero es cuestión de tiempo. Ademá s, tenemos
clientes en Europa (GDPR) y Brasil (LGPD), y no estamos cumpliendo
completamente con esas regulaciones. El riesgo legal y reputacional es
muy alto." Carlos Mendoza complementó: "Hemos invertido dinero en
mitigar fraude. Vemos en nuestros reportes que perdemos aproximadamente
\$180,000 USD anuales en fraude detectable (duplicación de
transacciones, tarjetas clonadas). Además, hay un problema de falsas de
clinaciones:

aproximadamente 12% de transacciones legítimas son rechazadas por
nuestro sistema de validación, y los clientes se van a la competencia.
No tenemos visibilidad clara de cuál es el problema." Sobre la Velocidad
de Cambio e Innovación Laura Fernández también mencionó un problema de
agilidad operacional: "Queremos agregar un nuevo proveedor de pago
(PayPal local para Argentina) porque nuestros clientes lo piden. Nuestro
equipo técnico me dice que esto toma 6 a 8 semanas de desarrollo por que
el sistema de pagos está tan acoplado que un cambio aquí afecta a
reserva, inventario y facturación. Hace 3 años, era incluso más lento.
Entonces ¿cómo esperamos innovar rápidamente en un mercado como este?"
Carlos Mendoza agregó una preocupación sobre la capacidad del equipo:
"Tenemos un equipo pequeño de 2 desarrolladores senior y 1 junior. Hace
poco, uno de los seniors intentó modificar la lógica de cancelación para
un nuevo país. Sin querer, rompió una fun cionalidad de cambio de fechas
en otro país. Pasamos 2 días depurando. El código es muy
interdependiente y frágil. Es casi imposible hacer cambios seguros sin
afectar algo más. Además, tenemos muy pocos tests automatizados
(cobertura menor al 40%), y la do cumentación técnica está
desactualizada. Cuando alguien nuevo entra al equipo, tarda semanas en
entender la arquitectura." Sobre la Capacidad Operacional y
Mantenimiento Roberto Díaz compartió un desafío adicional sobre
disponibilidad y operación: "Hacer cambios en producción es un proceso
angustioso. Cuando necesitamos hacer mantenimiento, tenemos que parar el
sistema entre 2 y 4 horas, y eso impacta clientes en múltiples zonas
horarias. No tenemos una estrategia de despliegue sin downtime. Además,
toda nuestra infraestructura está en una sola región (AWS us-east-1). Si
algo falla ahí, perdemos todo. No tenemos backups geo -distribuidos, y
nuestro plan de recuperación ante desastres dice que el RTO (Recovery
Time Objective) es superior a 4 horas, lo cual es inaceptable para una
plataforma de viajes. Los usuarios no pueden esperar medio día para ver
sus reservas." Objetivos de Negocio y Restricciones del Proyecto
Objetivo Financiero Incrementar ingresos anuales en 25% durante los
próximos 3 años, reduciendo costos operativos en un 15% a través de
automatización y eficiencia. Proyección: • Año actual: \$51.6M • Año 1:
\$64.5M • Año 2: \$80.6M • Año 3: \$100.7M Objetivo Operacional Reducir
abandonos de carrito del 25 -30% actual al 8 -10%, mejorando experiencia
de usuario y aumentando conversión. Objetivo de Compliance y Riesgo
Alcanzar cumplimiento PCI-DSS 3.2.1, GDPR y normativas locales en cada
país dentro de 12 meses.

Restricciones del Proyecto • Equipo máximo de 4 personas para
arquitectura (8 semanas) y 4 personas para desarrollo (8 semanas) •
Total 16 semanas para demostración de concepto (Proyecto I + II) •
Presupuesto limitado; debe evaluarse viabilidad técnica antes de una
gran inversión • Sistema actual debe seguir operando durante toda la
transformación (migración gradual) • Debe ser cloud-agnostic
(actualmente AWS, pero evaluar portabilidad) Requisitos del Nuevo
Sistema Visión Arquitectónica TravelHub requiere una arquitectura
moderna, distribuida y resiliente que soporte crecimiento exponencial,
garantice disponibilidad 24/7, cumpla con regulaciones internacionales y
permita cambios rápidos al negocio sin comprometer estabilidad. Módulos
Funcionales Esperados Motor de Búsqueda y Disponibilidad El corazón de
TravelHub es la capacidad de buscar rápidamente entre 1,200+ hospedajes
en 6 países. Los usuarios deben poder filtrar por ubicación, fechas,
capacidad de huéspedes, amenidades específicas (piscina, wifi, desayuno
incluido) y rango de precio. El sistema deberá entrenar un algoritmo de
ranking que ordene los resultados no solo por precio, sino por
popularidad, reseñas de usuarios, distancia a puntos de interés
turísticos, y otros factores que impulsen la conversión. La
disponibilidad debe estar sincronizada con los sistemas PMS de los
hoteles en tiempo casi real (actualización máximo cada 2 minutos), no
solo 2-3 veces al día como sucede actualmente.\
Sistema de Reserva y Carrito de Compra Una vez el usuario selecciona una
propiedad, debe poder crear una reserva de forma rápida y segura. El
nuevo sistema implementará un "carrito provisional" con un hold de 15
minutos, lo que significa que tan pronto alguien selecciona una
habitación, esa habitación se reserva temporalmente solo para ese
usuario. Esto previene el problema actual de overbooking donde dos
usuarios diferentes reservan la misma habitación simultáneamente. El
carrito usará persistencia optimista: los cambios se guardan localmente
e n el navegador inmediatamente, y se sincronizan con el servidor en
background sin bloquear la UI. Cuando el usuario confirma, el sistema
calcula automáticamente la tarifa (incluyendo descuentos dinámicos),
impuestos locales según el país, y políticas especiales de cancelación.
También valida que el cliente cumpla con requisitos como depósito mínimo
o documentación necesaria. Servicio de Pagos Desacoplado y Seguro Uno de
los cambios arquitectónicos más críticos es separar completamente el
servicio de pagos del resto del sistema. Actualmente, cualquier problema
con un proveedor de pago (Stripe, Mercado Pago, PayPal) afecta toda la
plataforma. En el nuevo diseño, el s ervicio de pagos es un componente
independiente que comunica con el sistema principal a través de eventos
asincronos. El usuario realiza la compra, el sistema registra una
transacción "pendiente", y el servicio de pagos procesa en background.
Si falla, pue de reintentar sin afectar búsquedas ni reservas. Además,
el sistema nunca almacenará datos crudos de tarjeta de crédito en bases
de datos propias. En su lugar , usará tokenización: los datos sensibles
se envían directamente a los proveedores de pago (Stripe, etc.) bajo
cifrado TLS 1.2+, y solo se guarda un token. Implementaremos detección
de fraude en tiempo real usando reglas (transacciones duplicadas,
velocidad sospechosa, validación 3D Secure) y

potencialmente machine learning. Los reportes de reconciliación deben
estar disponibles en menos de 12 horas, no 5-7 días como ahora.
Sincronización Continua de Inventario (PMS Integration) Actualmente,
TravelHub se integra con cada PMS (Property Management System) de los
hoteles manualmente o con scripts que corren cada 2 -3 horas. Esto causa
inconsistencias: vendemos habitaciones que ya están ocupadas, perdemos
ofertas especiales porque no las actualizamos a tiempo. En el nuevo
sistema, cada proveedor de PMS (Hotelbeds, TravelClick, RoomRaccoon,
etc.) se integrará en tiempo real a través de webhooks. Cuando un hotel
marca una habitación como ocupada en su sistema, TravelHub lo sabe en
segundo s, no horas. El sistema manejará también la conversión de
tarifas a múltiples monedas (USD, ARS, CLP, PEN, COP, MXN)
automáticamente usando APIs de cotización. Y lo más importante:
implementará lógica inteligente de resolución de conflictos. Si detecta
que una habitación está siendo vendida simultáneamente en dos canales,
tiene estrategias de fallback (ofrecer habitación similar, avisar al
cliente, etc.). Gestión Integrada de Cambios y Modificaciones Los
clientes frecuentemente necesitan cambiar fechas, ocupantes o incluso
cancelar. Sandra López, del equipo de Servicio al Cliente, reportó que
50 -80 tickets diarios son sobre cambios rechazados sin razón clara. El
nuevo sistema expondrá una API clara par a que clientes y hoteles puedan
modificar reservas directamente. Un viajero puede cambiar fechas,
ocupantes o tarifa (si aplica) en minutos, no horas. Para cancelaciones,
el sistema procesará automáticamente reembolsos según las políticas de
cada propiedad (no reembolsable, reembolso parcial antes de X días,
etc.). Todas estas operaciones estarán auditadas: cada cambio quedará
registrado en el historial de la reserva con timestamp, usuario, IP, y
razón del cambio. Portal Estratégico para Hoteles y Agencias Los hoteles
y agencias de viaje asociadas necesitan visibilidad completa de sus
operaciones en TravelHub. El nuevo portal les permitirá ver un dashboard
ejecutivo con todas sus reservas, con capacidad de filtrar por fecha,
estado, cliente, y más. Podrán generar reportes detallados de ocupación
(¿cuántas habitaciones vendidas cada noche?), ingresos (¿cuánto ganaron
esta semana?), y comisiones (¿cuánto le debemos pagar a agencias?).
Estos reportes estarán disponibles en múltiples formatos: PDF para
impresión, Excel para análisis, y API para integraciones con sus propios
sistemas. Los hoteles también podrán gestionar sus términos y
condiciones, políticas de cancelación, y ver integrado el feedback de
clientes (reseñas, ratings). Aplicaciones Móviles Nativas o
Cross-Platform TravelHub debe ofrecer experiencias móviles para iOS y
Android. Estos pueden ser desarrollados como aplicaciones nativas (mejor
rendimiento) o cross -platform (código compartido, como React Native o
Flutter). La aplicación móvil debe soportar búsqueda offli ne en una
base de datos caché que se sincroniza automáticamente cuando hay
conexión. La gestión de reservas debe ser intuitiva, mostrando
confirmaciones, itinerarios, y opciones para cambiar o cancelar. Un
componente clave es el check-in mediante QR code: en lugar de esperar
por un agente en el lobby , el viajero escanea un código al llegar al
hotel. Finalmente, la aplicación debe recibir notifications para cambios
relevantes (tu reserva fue confirmada, tu hotel está a 30 minutos,
check-in disponible). Requisitos de Desempeño, Escalabilidad y
Confiabilidad La arquitectura debe estar diseñada para satisfacer
exigencias muy precisas en términos de rendimiento y disponibilidad.
Cuando un usuario busca hospedaje, espera resultados en menos de 800
milisegundos (percentil 95). Actualmente tarda 3 -5 segundos. El de
talle de una propiedad debe

cargar en menos de 500 milisegundos. Las consultas de disponibilidad en
tiempo real deben responder en 200 milisegundos (percentil 99). Cuando
alguien crea una reserva, el sistema debe responder en menos de 1.5
segundos. Un pago debe procesarse en menos de 3 segundos. El histórico
de reservas debe cargar en 1 segundo. Estos tiempos no son arbitrarios:
cada 100 milisegundos de latencia adicional aumenta la pérdida de
clientes significativamente. La competencia (Booking, Airbnb) establece
estos estándares de industria. Paralelamente, el sistema debe escalar
horizontalmente. Actualmente, TravelHub procesa 150 transacciones por
minuto en promedio, pero durante Semana Santa, Navidad, o promotions
especiales, ese número sube a 400+ TPM. El equipo de Roberto Díaz
reporta que la base de datos llega al 85% de CPU en horas pico y
comienzan a rechazar peticiones. El nuevo diseño debe permitir agregar
servidores automáticamente ante picos de carga. Si hay más búsquedas, se
crean más instancias del servicio de búsqueda. Si hay más p agos, se
escalan solo los procesadores de pago, sin afectar búsquedas. La base de
datos se particiona por país (sharding geográfico), de modo que
consultas para Colombia no compitan con consultas de Argentina. Un
balanceador de carga inteligente distribuye\
tráfico entre instancias de forma que cualquier instancia pueda fallar
sin que los usuarios lo noten. La disponibilidad también es crítica. El
objetivo es 99.95% de uptime mensual, lo que significa máximo 21.6
minutos de downtime al mes. Actualmente, TravelHub está disponible el
98.5%. El nuevo sistema debe implementar redundancia geográfica: en
lugar de tener toda la infraestructura en una sola región de AWS (us
-east-1), debe replicarse en mínimo dos regiones. Si u na zona falla
completamente, el tráfico se enruta automáticamente a otra región. Esto
requiere bases de datos replicadas, caché distribuido, y orquestación
inteligente. El tiempo de recuperación ante un desastre total (RTO) debe
ser menor a 15 minutos, y la cantidad de datos perdidos (RPO) menor a 5
minutos. Las actualizaciones de código deben ocurrir sin downtime: el
sistema maneja despliegues "blue-green" o "canary" donde la versión
nueva se prueba con 5% del tráfico antes de llevar 100%. Si algo sale
mal, la nueva versión se revierte automáticamente. Las fallas en
cálculos asociados a cobros, reservas o impuestos deben ser detectadas
en menos de 500 milisengundos. La seguridad es inseparable de la
arquitectura. Todo dato en tránsito debe estar cifrado con TLS 1.2+. Los
datos sensibles en reposo deben estar encriptados con AES -256. Los
datos de tarjeta de crédito deben cumplir PCI -DSS 3.2.1, lo que
significa tokeniza ción (nunca los guardamos en texto plano) y auditoría
completa. Todos los usuarios administrativos deben usar autenticación
multifactor (MFA). El sistema debe tener control de acceso basado en
roles (RBAC): un empleado de Colombia no debería ver datos de c lientes
de Argentina. Todas las operaciones sensibles quedan registradas en logs
con trazabilidad completa. El sistema detecta fraude en tiempo real: si
alguien intenta acceder desde una ubicación imposible (China hace 5
minutos, ahora Argentina), se gener a una alerta en \< 2 segundos. El
sistema también responde a regulaciones internacionales: GDPR en Europa
(derecho al olvido, exportación de datos), LGPD en Brasil, y normativas
locales en cada país. Finalmente, el código debe ser mantenible. Cuando
Laura Fernández pide agregar PayPal local para Argentina, el equipo
técnico no debe decir "6-8 semanas". En una arquitectura bien diseñada,
agregar un nuevo proveedor de pago debería tomar máximo 40 horas d e
trabajo, porque es solo extender el adaptador de pagos, sin tocar
búsquedas, reservas, o facturación. Si una política de cancelación
cambia, debe afectarse solo el servicio de reservas, no más de 5
módulos. Esto requiere componentes desacoplados, interfa ces bien
definidas (API contracts en Swagger/OpenAPI), tests automáticos
(cobertura ≥ 70% para servicios críticos), documentación técnica
actualizada, y decisiones arquitectónicas registradas. Cuando alguien
nuevo entra al equipo, debe poder entender el sistema\
en días, no semanas. El pipeline de CI/CD debe permitir despliegues
múltiples veces al día de forma segura.

Operación Requisito Actual Búsqueda de hospedaje ≤ 800ms (p95) 3-5s
Detalle de propiedad ≤ 500ms (p95) 1.2-1.5s Consulta de disponibilidad ≤
200ms (p99) Inconsistente Creación de reserva ≤ 1.5s (p95) 2-3s
Procesamiento de pago ≤ 3s (p95) 4-6s Histórico de reservas ≤ 1s (p95)
6-8s

Requisitos de Escalabilidad • Capacidad base: 100 usuarios concurrentes
por país • Picos estacionales: hasta 600 usuarios concurrentes
simultáneos (6 países = 3,600 usuario/min) • Transacciones por minuto:
150 TPM (base) → 800 TPM (pico) • Autoescalado horizontal: agregar nodos
de procesamiento automáticamente ante carga • Proyección a 3 años:
crecer de 1,200 a 2,500 propiedades (108% volumen);\
Requisitos de Disponibilidad • Disponibilidad objetivo: ≥ 99.95% mensual
(máximo 21.6 minutos downtime/mes) • Redundancia geográfica: replicación
activo-activo en ≥ 2 regiones por continente • RTO (Recovery Time
Objective): ≤ 15 minutos ante fallo total • RPO (Recovery Point
Objective): ≤ 5 minutos (pérdida máxima de datos) • Zero-downtime
deployment: cambios de código sin interrupciones • Health checks cada 10
segundos Requisitos de Seguridad • Cumplimiento PCI -DSS 3.2.1: datos de
tarjeta nunca en bases de datos propias (usar tokenización) •
Encriptación de datos en tránsito: TLS 1.2+ para todas las
comunicaciones • Encriptación de datos en reposo: AES -256 para
información sensible (emails, teléfonos, historial) • Autenticación
multifactor (MFA): obligatorio para acceso administrativo, opcional para
usuarios finales • Control de acceso basado en roles (RBAC): definir
permisos específicos por rol • Auditoría completa: registrar todos los
cambios de datos sensibles con timestamp, usuario, IP • Detección de
anomalías: alertas \< 2 segundos en intentos de fraude, accesos
inusuales • Protección contra ataques comunes: CSRF, XSS, SQL Injection,
brute force • GDPR compliance: derecho al olvido, exportación de datos,
consent management • LGPD compliance (Brasil): similar a GDPR, datos
locales Requisitos de Facilidad de Modificación (Mantenibilidad) •
Arquitectura de microservicios: módulos independientes con APIs claras •
Agregar nuevo proveedor de pago: ≤ 40 horas/hombre • Cambiar política de
cancelación: ≤ 8 horas/hombre (modificar un servicio, no 5+)

• Agregar nuevo canal de distribución (OTA): ≤ 60 horas/hombre •
Cobertura de tests: ≥ 80% para servicios críticos • API contracts bien
definidos: OpenAPI/Swagger, versionadas • Documentación técnica
actualizada: arquitectura, flujos, decisiones (ADRs) • CI/CD pipeline:
despliegues múltiples veces al día sin riesgo • Rollback automático si
hay fallas en producción Funcionalidades Esperadas en el Prototipo
(Semana 16) El equipo debe priorizar las funcionalidades más críticas
para demostrar viabilidad de la arquitectura. A continuación se detallan
las funcionalidades mínimas esperadas, agrupadas por módulo: Portal Web
(Backend + Frontend) • Búsqueda de hospedaje por ciudad, fechas,
capacidad • Detalle de propiedad con imágenes, descripción, amenidades,
reseñas • Creación de reserva con cálculo automático de tarifa •
Integración con proveedor de pago (Stripe o similar) • Confirmación de
reserva por email • Consulta de mis reservas (login usuario) •
Cancelación con devolución automática Portal de Hoteles (Backend +
Frontend) • Login y autenticación • Dashboard de reservas (listado
filtrable, búsqueda) • Detalle de reserva con opción de
confirmar/rechazar • Reporte de ingresos por mes (gráfico + tabla) •
Gestión de tarifa (crear, editar, aplicar descuentos) Aplicación Móvil
(iOS/Android o cross-platform) • Búsqueda de hospedaje • Detalle y
creación de reserva • Visualización de reservas • Push notifications
para cambios de estado • QR code check-in (si aplica) Restricciones del
Desarrollo y Aspectos Importantes Restricciones de Recursos • Equipo
máximo: 4 personas • Fase 1 (Arquitectura): 8 semanas • Fase 2
(Desarrollo): 8 semanas • Total: 16 semanas para MVP funcional •
Presupuesto limitado; valorizar tecnologías open-source • La
demostración en semana 16 es crítica para la inversión de riesgo
