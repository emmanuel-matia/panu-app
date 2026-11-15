import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
export function MemberPrompt({label="S'abonner",className}:{label?:string;className?:string}) {
  const [open,setOpen]=useState(false);
  return <><Button variant="outline" className={className} onClick={()=>setOpen(true)}>{label}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Rejoindre PANU</DialogTitle></DialogHeader><p>Un compte est nécessaire pour s’abonner ou participer à un panel.</p><Button asChild><Link to="/inscription" target="_blank">Créer un compte</Link></Button><Button asChild variant="outline"><Link to="/connexion" target="_blank">J’ai déjà un compte</Link></Button><Button variant="ghost" onClick={()=>setOpen(false)}>Continuer à regarder</Button></DialogContent></Dialog></>;
}