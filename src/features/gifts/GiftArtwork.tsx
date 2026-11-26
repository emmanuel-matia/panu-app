import { Gift as GiftIcon } from 'lucide-react';
import { useState } from 'react';
import './gifts.css';

export function GiftArtwork({ name, imageUrl, animationUrl, animation = 'none', animate = false, large = false }: { name: string; imageUrl: string | null; animationUrl?: string | null; animation?: string; animate?: boolean; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const source = animate && animationUrl ? animationUrl : imageUrl;
  return <div className={`flex aspect-square w-full items-center justify-center overflow-hidden ${large ? 'max-w-64' : 'max-w-32'}`}>
    {source && !failed ? <img src={source} alt={name} loading="lazy" onError={() => setFailed(true)} className={`h-full w-full object-contain ${animate && animation !== 'none' ? `panu-gift-${animation}` : ''}`} /> : <GiftIcon className="size-12 text-gold" aria-label={`Illustration indisponible : ${name}`} />}
  </div>;
}
