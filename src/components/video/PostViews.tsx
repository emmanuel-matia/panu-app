import { Eye, Users } from 'lucide-react';
import { viewsLabel,uniqueViewsLabel } from '@/lib/view-rules';
export function PostViews({total,unique,compact=false}:{total:number;unique:number;compact?:boolean}) {
 return <span className={'flex flex-col gap-1 '+(compact?'text-[10px]':'text-xs font-semibold')}><span className="flex items-center gap-1"><Eye className="size-3.5 shrink-0"/>{viewsLabel(total)} totales</span><span className="flex items-center gap-1"><Users className="size-3.5 shrink-0"/>{uniqueViewsLabel(unique)}</span></span>;
}