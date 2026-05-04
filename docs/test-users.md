# Test Users

Usuarios precargados por los seeds de `auth-service`. Disponibles en entorno local y staging.

## Usuarios

| Email | Contraseña | Rol | Notas |
|---|---|---|---|
| `admin@travelhub.com` | `Admin1234!` | `admin` | Acceso total |
| `partner@travelhub.com` | `Partner1234!` | `partner` | Socio — Gran Caribe Hospitality Group |
| `partner2@travelhub.com` | `Partner1234!` | `partner` | Socio — Sol Boutique Hotels & Hostales |
| `guest@travelhub.com` | `Guest1234!` | `guest` | Huésped — tiene reserva confirmada para hoy (ver abajo) |

## Reservas de prueba (booking-service seed)

| ID | Usuario | Propiedad | Fechas | Estado |
|---|---|---|---|---|
| `f1000000-…0001` | admin | Gran Caribe Resort — Deluxe King | 2027-03-01 → 2027-03-04 | confirmed |
| `f1000000-…0002` | admin | Gran Caribe Resort — Ocean Suite | 2027-07-05 → 2027-07-09 | confirmed |
| `f1000000-…0003` | partner | Hotel Histórico Centro — Deluxe King | 2027-02-10 → 2027-02-13 | confirmed |
| `f1000000-…0004` | guest | Hostal Sol Cancún — Standard Double | 2027-05-10 → 2027-05-13 | submitted |
| `f1000000-…0005` | guest | Gran Caribe Resort — Deluxe King | **hoy → hoy+3d** | confirmed ✅ check-in |

> RES(5) usa fechas dinámicas (`TODAY` al momento de correr el seed). Re-ejecutar el seed reinicia la ventana de check-in al día actual.

## Flujo de check-in QR (RES 5)

1. Iniciar sesión en la app móvil como `guest@travelhub.com`
2. Ir a **Mis Reservas** → reserva Gran Caribe con check-in hoy
3. Tocar **Hacer check-in**
4. Escanear el QR con valor:
   ```
   travelhub://checkin?key=checkin-key-prop-cancun-1
   ```
5. La reserva pasa a estado **Check-in realizado**

> El QR se obtiene del portal del partner: `partner@travelhub.com` → Gran Caribe → botón QR.

## Cómo correr los seeds

```bash
# Auth
cd services/auth-service && npx tsx scripts/seed.ts

# Booking (incluye RES(5) con fecha dinámica)
cd services/booking-service && npx tsx scripts/seed.ts

# Partners (check-in keys)
cd services/partners-service && npx tsx scripts/seed.ts
```
