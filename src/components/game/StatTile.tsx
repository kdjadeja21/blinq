interface StatTileProps {
  label: string;
  value: string;
}

/** Label/value tile. Must be rendered inside a `<dl>`. */
export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-2xl border-2 bg-card p-3 shadow-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
