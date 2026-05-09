# Frontend — Page Shell canónico

Toda página nueva en `frontend/` debe usar el shell canónico para mantener consistencia visual entre pantallas. El shell es **opinión, no preferencia**: hay un único patrón aprobado y se aplica salvo en los tres casos documentados al final.

## Anatomía de una página

```tsx
import PageHero from '../../components/PageHero';
import PageContainer from '../../components/PageContainer';
import { Tabs, Tab } from '@mui/material';

export default function MyPage() {
  return (
    <>
      <PageHero>{/* hero band azul (opcional) */}</PageHero>

      {/* tabs de página (opcional) — full-bleed con bg blanco */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3 }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto' }}>
          <Tabs value={tab} onChange={...}>...</Tabs>
        </Box>
      </Box>

      <PageContainer>
        {/* contenido principal: cards, tablas, formularios */}
      </PageContainer>
    </>
  );
}
```

## Componentes

| Componente | Archivo | Renderiza | Cuándo usar |
|---|---|---|---|
| `PageHero` | `frontend/src/components/PageHero.tsx` | `<div>` full-bleed con `bgcolor: theme.primary` | Para landing/dashboard pages que necesitan un banner azul al tope. Opcional. |
| `PageContainer` | `frontend/src/components/PageContainer.tsx` | `<main className="max-w-[1152px] mx-auto w-full px-6 py-6 flex flex-col gap-6">` | **Siempre**, para cualquier página de contenido stacked vertical. |

`PageContainer` es opinionado: una sola variante, sin props. Si una página necesita layout distinto (sidebar, padding extra, etc.), no aceptamos props nuevas — esa página vive sin `PageContainer` (ver excepciones abajo).

## Tokens de tema

Definidos en `frontend/src/theme.ts`. Úsalos vía MUI (`color="primary"`, `theme.palette.warning.main`) en vez de hardcodear hex:

| Token | Valor | Uso |
|---|---|---|
| `palette.primary.main` | `#3a608f` | Hero band, links, focus rings |
| `palette.warning.main` | `#F5C842` | CTAs primarios (Guardar, Reservar) |
| `palette.success.main` | `#97C459` | Estados positivos |
| `palette.background.default` | `#f8f9ff` | Fondo del root layout |

Hex dispersos en código (`#1B4F8C`, `#1a2332`, `#5a6a7e`) **no son tokens** — vienen de iteraciones de diseño viejas. Si vas a usar uno nuevo, considera primero si encaja con un token existente.

## Convención de claves i18n

Patrón: `<role>.<feature>.<key>` para páginas, anidando sub-namespaces cuando hay sub-pantallas.

```
partner.properties.title
partner.properties.edit.tabs.info
partner.properties.edit.info.sidebar.pause_listing
booking.checkout.title
trips.error
```

Las claves van en `frontend/src/i18n/locales/es.json` y `en.json` simultáneamente. Nunca dejes solo uno de los dos.

## Registrar la ruta

`frontend/src/router.tsx`:

```tsx
import MyPage from './pages/<role>/<feature>';

const myRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-feature/$id',
  component: MyPage,
});

const routeTree = rootRoute.addChildren([..., myRoute]);
```

## Checklist — nueva página partner

- [ ] Archivo en `frontend/src/pages/<role>/<feature>/index.tsx` (o carpeta con sub-tabs).
- [ ] Usa `<PageHero>` (si aplica) + `<PageContainer>`.
- [ ] Ruta registrada en `router.tsx`.
- [ ] Claves i18n agregadas en ambos `es.json` y `en.json` bajo `<role>.<feature>.*`.
- [ ] Mutations + queries usan el patrón fetch + Bearer del `useAuth()` hook (ver `pages/partner/property/edit/` como ejemplo).
- [ ] Botones con loading: usan `loading={isPending}`, no `disabled={isPending}` ni texto condicional.
- [ ] Sin snackbars/toasts — feedback viene del re-render con data fresca.
- [ ] Tests de las funciones puras (helpers tipo `fromX`/`toX`) en un `*.spec.ts` adjunto. Mira `pages/partner/property/edit/shared.spec.ts` como referencia.

## Cuándo NO usar PageContainer

Tres categorías de páginas viven fuera del shell canónico **a propósito**:

1. **Auth full-bleed** (`LoginPage`, `MfaPage`, `RegisterPage`, `RegisterSuccess`, `PartnerRegisterPage`): contenido centrado vertical en pantalla completa. Wrapper actual: `<main className="flex-1 flex items-center justify-center py-10 px-4">`.

2. **Layouts con sidebar** (`SearchPage`): flex-row con barra lateral filtra resultados. No es contenido stacked. Wrapper actual: `<main className="max-w-[1152px] mx-auto w-full px-6 py-8 flex gap-8 flex-1">`.

3. **Estados de proceso a sangre** (`BookingConfirmationPage` cuando `status === 'pending'` o `'failed'`): pantallas de spinner/error centradas verticalmente, no usan container. La rama "success" sí usa `<PageContainer>`.

Si una página tuya cae en una de estas categorías, déjala con su wrapper actual y comenta arriba el por qué.
