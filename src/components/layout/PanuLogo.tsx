export function PanuLogo({ withTagline = true }: { withTagline?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-primary-foreground shadow-glow">
        P
      </div>
      <div>
        <p className="text-xl font-bold tracking-tight text-foreground">PANU</p>
        {withTagline ? (
          <p className="text-[0.6875rem] text-muted-foreground">
            Plateforme Africaine Numérique
          </p>
        ) : null}
      </div>
    </div>
  );
}
