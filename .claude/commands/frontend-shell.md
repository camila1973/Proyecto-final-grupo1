# Frontend — Canonical Page Shell

Every new page in `frontend/` must use the canonical shell to keep visual consistency across screens. The shell is **opinionated, not preference-driven**: there is one approved pattern and it applies unless the page falls into one of the three documented exceptions at the bottom.

## Page anatomy

```tsx
import PageHero from '../../components/PageHero';
import PageContainer from '../../components/PageContainer';
import { Tabs, Tab } from '@mui/material';

export default function MyPage() {
  return (
    <>
      <PageHero>{/* blue hero band (optional) */}</PageHero>

      {/* page tabs (optional) — full-bleed white background */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3 }}>
        <Box sx={{ maxWidth: 1152, mx: 'auto' }}>
          <Tabs value={tab} onChange={...}>...</Tabs>
        </Box>
      </Box>

      <PageContainer>
        {/* main content: cards, tables, forms */}
      </PageContainer>
    </>
  );
}
```

## Components

| Component | File | Renders | When to use |
|---|---|---|---|
| `PageHero` | `frontend/src/components/PageHero.tsx` | Full-bleed `<div>` with `bgcolor: theme.primary` | Landing/dashboard pages that need a blue banner at the top. Optional. |
| `PageContainer` | `frontend/src/components/PageContainer.tsx` | `<main className="max-w-[1152px] mx-auto w-full px-6 py-6 flex flex-col gap-6">` | **Always**, for any page with stacked vertical content. |

`PageContainer` is opinionated: a single variant, no props. If a page needs a different layout (sidebar, extra padding, etc.), we don't add new props — that page lives without `PageContainer` (see exceptions below).

## Theme tokens

Defined in `frontend/src/theme.ts`. Use them via MUI (`color="primary"`, `theme.palette.warning.main`) instead of hardcoding hex values:

| Token | Value | Use |
|---|---|---|
| `palette.primary.main` | `#3a608f` | Hero band, links, focus rings |
| `palette.warning.main` | `#F5C842` | Primary CTAs (Save, Book) |
| `palette.success.main` | `#97C459` | Positive states |
| `palette.background.default` | `#f8f9ff` | Root layout background |

Hex values scattered through code (`#1B4F8C`, `#1a2332`, `#5a6a7e`) **are not tokens** — they come from old design iterations. Before introducing a new one, check whether it fits an existing token.

## i18n key convention

Pattern: `<role>.<feature>.<key>` for pages, nesting sub-namespaces when there are sub-screens.

```
partner.properties.title
partner.properties.edit.tabs.info
partner.properties.edit.info.sidebar.pause_listing
booking.checkout.title
trips.error
```

Keys go into `frontend/src/i18n/locales/es.json` and `en.json` simultaneously. Never leave only one of the two updated.

## Registering the route

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

## Checklist — new partner page

- [ ] File at `frontend/src/pages/<role>/<feature>/index.tsx` (or a folder with sub-tabs).
- [ ] Uses `<PageHero>` (if applicable) + `<PageContainer>`.
- [ ] Route registered in `router.tsx`.
- [ ] i18n keys added to both `es.json` and `en.json` under `<role>.<feature>.*`.
- [ ] Mutations + queries follow the fetch + Bearer pattern from `useAuth()` hook (see `pages/partner/property/edit/` for a reference).
- [ ] Buttons with loading state use `loading={isPending}`, not `disabled={isPending}` plus conditional text.
- [ ] No snackbars/toasts — feedback comes from re-rendering with fresh data.
- [ ] Tests for pure helpers (e.g. `fromX`/`toX`) in an adjacent `*.spec.ts`. See `pages/partner/property/edit/shared.spec.ts` as a reference.

## When NOT to use PageContainer

Three categories of pages live outside the canonical shell **on purpose**:

1. **Full-bleed auth screens** (`LoginPage`, `MfaPage`, `RegisterPage`, `RegisterSuccess`, `PartnerRegisterPage`): vertically centered content on a full-bleed background. Current wrapper: `<main className="flex-1 flex items-center justify-center py-10 px-4">`.

2. **Sidebar layouts** (`SearchPage`): flex-row with a sidebar that filters results. Not stacked content. Current wrapper: `<main className="max-w-[1152px] mx-auto w-full px-6 py-8 flex gap-8 flex-1">`.

3. **Full-bleed process states** (`BookingConfirmationPage` when `status === 'pending'` or `'failed'`): centered spinner/error screens that don't use a container. The `success` branch does use `<PageContainer>`.

If your page falls into one of these categories, leave it with its current wrapper and add a comment at the top explaining why.
