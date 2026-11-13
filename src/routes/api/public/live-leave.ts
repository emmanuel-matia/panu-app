import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/api/public/live-leave')({
 server: { handlers: { POST: async ({request}) => {
  // Capability token authorizes only ending its own watch session, never a live.
  if(request.headers.get('origin') !== new URL(request.url).origin) return new Response(null,{status:403});
  const token=z.string().regex(/^[a-f0-9]{64}$/).safeParse(await request.text());
  if(!token.success) return new Response(null,{status:400});
  const {leaveWatch}=await import('@/lib/live.server');
  await leaveWatch(token.data);
  return new Response(null,{status:204});
 } } },
});