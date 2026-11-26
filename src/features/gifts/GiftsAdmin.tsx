import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Gift, Pencil, Plus, Save, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useStepUp } from '@/components/security/StepUp';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAdminGifts, saveGiftConfig, saveGiftRevenueConfig } from '@/lib/gifts.functions';
import { giftCategoryLabel, giftConfigSchema, creatorPercentSchema, type Gift as GiftData } from '@/lib/gifts-rules';
import { isStepUpRequiredError } from '@/lib/passkey-rules';
import { CoinField, CoinSelect } from '@/features/wallet/CoinControls';
import { GiftArtwork } from './GiftArtwork';
import { GiftHistory } from './GiftHistory';

const blank = { id: '', slug: '', name: '', description: '', image_path: '', animation: 'none', animation_path: '', price_coins: '', category: 'accessible', active: false, available: true, popular: false, position: 0 };
export function GiftsAdmin() {
  const fetch = useServerFn(getAdminGifts);
  const save = useServerFn(saveGiftConfig);
  const saveRevenue = useServerFn(saveGiftRevenueConfig);
  const query = useQuery({ queryKey: ['admin','gifts'], queryFn: () => fetch() });
  const cache = useQueryClient();
  const { user } = useAuth();
  const stepUp = useStepUp();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  function invalidate() { void cache.invalidateQueries({ queryKey: ['admin','gifts'] }); void cache.invalidateQueries({ queryKey: ['panu-gifts'] }); }
  const mutation = useMutation({ mutationFn: (data: Parameters<typeof save>[0]) => save(data), onSuccess: () => { invalidate(); setEditing(false); toast.success('Cadeau enregistré'); }, onError: (e, variables) => { if (isStepUpRequiredError(e.message)) stepUp.request(() => mutation.mutate(variables)); else toast.error(e.message); } });
  const revenue = useMutation({ mutationFn: (data: Parameters<typeof saveRevenue>[0]) => saveRevenue(data), onSuccess: () => { invalidate(); setPercent(''); toast.success('Répartition enregistrée'); }, onError: (e, variables) => { if (isStepUpRequiredError(e.message)) stepUp.request(() => revenue.mutate(variables)); else toast.error(e.message); } });
  const update = <K extends keyof typeof blank>(key: K, value: typeof blank[K]) => setForm((old) => ({ ...old, [key]: value }));
  function open(gift: GiftData & { imageUrl: string | null }) { setForm({ ...gift, animation_path: gift.animation_path ?? '' }); setPreview(gift.imageUrl); setEditing(true); }
  async function upload(file: File, animation: boolean) {
    if (!user) return;
    const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' } as Record<string,string>)[file.type];
    if (!extension || (animation && extension !== 'gif') || file.size > 5 * 1024 * 1024) { toast.error('Image PNG, JPG, WebP ou GIF, 5 Mo maximum. Animation : GIF uniquement.'); return; }
    setUploading(true);
    try {
      const path = `${user.id}/gift-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('avatars').upload(path,file,{ contentType: file.type, upsert: false });
      if (error) throw new Error('Import refusé. Vérifiez le format et réessayez.');
      update(animation ? 'animation_path' : 'image_path', path);
      if (!animation) { const { data } = await supabase.storage.from('avatars').createSignedUrl(path,600); setPreview(data?.signedUrl ?? null); }
      toast.success(animation ? 'Animation importée. Enregistrez le cadeau.' : 'Illustration importée. Enregistrez le cadeau.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Import impossible'); } finally { setUploading(false); }
  }
  function submit() {
    const { id, ...fields } = form;
    const parsed = giftConfigSchema.safeParse({ ...fields, ...(id ? { id } : {}), animation_path: form.animation_path || null });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Cadeau invalide'); return; }
    mutation.mutate({ data: parsed.data });
  }
  if (query.isPending) return <p className="py-8 text-sm text-muted-foreground">Chargement du catalogue Cadeaux…</p>;
  if (query.isError || !query.data) return <div role="alert" className="py-6"><p className="text-sm text-destructive">Catalogue financier inaccessible : {query.error?.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button></div>;
  const data = query.data;
  const currentPercent = percent === '' ? String(data.config.creator_percent) : percent;
  return <section className="space-y-5 border-t border-border pt-6">
    {stepUp.dialog}
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-normal"><Gift className="text-gold"/>PANU Cadeaux</h2><Button asChild variant="outline" size="sm"><Link to="/cadeaux">Galerie</Link></Button></header>
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" size="sm" onClick={() => { setForm({ ...blank, position: data.gifts.length + 1 }); setPreview(null); setEditing(true); }}><Plus/>Ajouter un cadeau</Button><span className="text-xs text-muted-foreground">{data.gifts.length} cadeaux · {data.gifts.filter((g) => g.active).length} actifs</span></div>
    <Input aria-label="Rechercher dans le catalogue administrateur" placeholder="Rechercher un cadeau" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={80}/>
    <ul className="divide-y divide-border">{data.gifts.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())).map((g) => <li key={g.id} className="flex items-center gap-3 py-3"><div className="w-16 shrink-0"><GiftArtwork name={g.name} imageUrl={g.imageUrl}/></div><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{g.name}</p><p className="text-xs text-gold">{BigInt(g.price_coins).toLocaleString('fr-FR')} Coins</p><p className="text-[11px] text-muted-foreground">{giftCategoryLabel(g.category)} · {g.active ? 'Actif' : 'Désactivé'} · {g.available ? 'Au catalogue' : 'Indisponible'} · Position {g.position}</p></div><Button variant="ghost" size="icon" title={`Modifier ${g.name}`} aria-label={`Modifier le cadeau ${g.name}`} onClick={() => open(g)}><Pencil/></Button></li>)}</ul>
    {editing ? <form aria-label="Configuration cadeau" onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4 border-t border-border pt-5">
      <div className="flex items-center justify-between"><h3 className="font-semibold tracking-normal">{form.id ? 'Modifier le cadeau' : 'Nouveau cadeau'}</h3><Button variant="ghost" size="icon" type="button" aria-label="Fermer la configuration cadeau" title="Fermer" onClick={() => setEditing(false)}><X/></Button></div>
      <CoinField label="Nom du cadeau"><Input required maxLength={80} value={form.name} onChange={(e) => update('name',e.target.value)}/></CoinField>
      <CoinField label="Identifiant unique"><Input required disabled={Boolean(form.id)} maxLength={80} value={form.slug} onChange={(e) => update('slug',e.target.value)}/></CoinField>
      <CoinField label="Description"><Input maxLength={500} value={form.description} onChange={(e) => update('description',e.target.value)}/></CoinField>
      <div className="grid grid-cols-2 gap-3"><CoinField label="Prix en Coins"><Input required type="number" min="1" max="1000000000" step="1" value={form.price_coins} onChange={(e) => update('price_coins',e.target.value)}/></CoinField><CoinField label="Position"><Input required type="number" min="0" max="1000000" step="1" value={form.position} onChange={(e) => update('position',Number(e.target.value))}/></CoinField></div>
      <CoinField label="Catégorie"><Input required maxLength={40} list="panu-gift-categories" value={form.category} onChange={(e) => update('category',e.target.value)}/><datalist id="panu-gift-categories">{[...new Set(['accessible','populaire','premium','special',...data.gifts.map((g) => g.category)])].map((c) => <option key={c} value={c}/>)}</datalist></CoinField>
      <div className="flex items-center gap-3"><div className="w-24"><GiftArtwork name={form.name || 'Illustration du cadeau'} imageUrl={preview}/></div><label className="min-w-0 flex-1 text-sm"><span className="mb-2 flex items-center gap-2"><Upload className="size-4"/>Illustration</span><Input aria-label="Importer une illustration cadeau" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading} onChange={(e) => { const file=e.target.files?.[0]; if(file) void upload(file,false); e.target.value=''; }}/></label></div>
      <CoinSelect label="Animation légère" value={form.animation} onChange={(value) => update('animation',value)} options={[{ value:'none',label:'Aucune' },{ value:'pulse',label:'Pulsation' },{ value:'float',label:'Flottement' },{ value:'sparkle',label:'Éclat' }]}/>
      <label className="block text-sm">Animation GIF facultative<Input aria-label="Importer une animation GIF cadeau" type="file" accept="image/gif" disabled={uploading} onChange={(e) => { const file=e.target.files?.[0]; if(file) void upload(file,true); e.target.value=''; }}/></label>{form.animation_path ? <Button type="button" variant="ghost" size="sm" onClick={() => update('animation_path','')}><X/>Retirer l’animation GIF</Button> : null}
      <div className="space-y-3">{[{ key:'active',label:'Actif dans la galerie' },{ key:'available',label:'Disponible au catalogue' },{ key:'popular',label:'Mise en avant populaire' }].map(({key,label}) => <label key={key} className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(form[key as 'active'|'available'|'popular'])} onCheckedChange={(v) => update(key as 'active'|'available'|'popular',v===true)}/>{label}</label>)}</div>
      <p className="text-xs text-muted-foreground">Désactivez un cadeau pour le retirer de la galerie. Les identifiants et traces sont conservés.</p><Button type="submit" disabled={uploading || mutation.isPending}><Save/>{mutation.isPending ? 'Enregistrement…' : 'Enregistrer le cadeau'}</Button>
    </form> : null}
    <form className="space-y-3 border-t border-border pt-5" aria-label="Partage des revenus cadeaux" onSubmit={(e) => { e.preventDefault(); const parsed=creatorPercentSchema.safeParse(Number(currentPercent)); if(!parsed.success){toast.error(parsed.error.issues[0]?.message ?? 'Pourcentage invalide');return;} revenue.mutate({data:{creatorPercent:parsed.data}}); }}>
      <h3 className="text-sm font-semibold tracking-normal">Partage des revenus cadeaux</h3><div className="grid grid-cols-2 gap-3"><CoinField label="Créateur (%)"><Input type="number" required min="0" max="100" step="0.01" value={currentPercent} onChange={(e) => setPercent(e.target.value)}/></CoinField><CoinField label="PANU (%)"><Input readOnly value={Number.isFinite(Number(currentPercent)) ? String(Math.round((100-Number(currentPercent))*100)/100) : '—'}/></CoinField></div>
      <p className="text-xs text-muted-foreground">Base : montant net réellement encaissé après frais du prestataire. Aucun taux Coins/argent n’est fixé. Les revenus restent en attente, non retirables.</p><Button type="submit" variant="outline" disabled={revenue.isPending}><Save/>{revenue.isPending ? 'Enregistrement…' : 'Enregistrer la répartition'}</Button>
    </form>
    <GiftHistory direction="admin"/>
  </section>;
}
