import { createFileRoute } from '@tanstack/react-router';
import { GiftsPage, giftsQueryOptions } from '@/features/gifts/GiftsPage';
export const Route = createFileRoute('/_authenticated/cadeaux')({
  loader: ({ context }) => context.queryClient.ensureQueryData(giftsQueryOptions),
  head: () => ({ meta: [
    { title: 'PANU Cadeaux — Galerie de cadeaux virtuels' },
    { name: 'description', content: 'Découvrez les cadeaux PANU, leurs illustrations originales et leurs prix en PANU Coins.' },
    { property: 'og:title', content: 'PANU Cadeaux — Galerie de cadeaux virtuels' },
    { property: 'og:description', content: 'Le catalogue des cadeaux PANU et leurs prix en Coins.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }),
  component: GiftsPage,
});
