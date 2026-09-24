export const GOLF_CLUB_HOSEL = { x: 34, y: 32 } as const;

export function ClubHead({ color, kind = 'iron' }: { color: string; kind?: string }) {
  if (kind === 'driver' || kind === 'wood') {
    return (
      <g transform={kind === 'wood' ? 'translate(5 4) scale(.85)' : undefined}>
        <path d="M10 2h17v3h7v5h4v13h-5v5H12v-3H6v-6H3V9h3V5h4z" fill="#17251e" />
        <path d="M11 5h14v3h7v5h3v8h-5v4H13v-3H9v-5H6v-7h5z" fill="#42565c" />
        <path d="M11 5h14v3h6v3H10V8h1z" fill={color} />
        <path d="M8 13h3v7h-3zm6 10h14v2H14z" fill="#819292" />
        <path d="M31 23h6v9h-6z" fill="#17251e" />
        <path d="M33 25h2v7h-2z" fill="#d2dbdb" />
      </g>
    );
  }
  if (kind === 'putter') {
    return (
      <>
        <path d="M6 16h33v8H6z" fill="#17251e" />
        <path d="M9 18h27v4H9z" fill="#c5d0d0" />
        <path d="M12 18h19v1H12z" fill="#f5f3ed" />
        <path d="M31 23h6v9h-6z" fill="#17251e" />
        <path d="M33 24h2v8h-2z" fill="#d2dbdb" />
        <path d="M25 18h3v4h-3z" fill={color} />
      </>
    );
  }
  return (
    <>
      <path d="M5 8h10v3h9v4h12v17h-6v-7H12v-4H5z" fill="#17251e" />
      <path d="M8 11h6v3h9v4h10v4H14v-4H8z" fill="#c5d0d0" />
      <path d="M9 11h4v3h9v2H12v-2H9z" fill="#f5f3ed" />
      <path d="M12 17h13v1H12zm3 3h14v1H15z" fill="#758a8c" />
      <path d="M32 24h2v8h-2z" fill="#d2dbdb" />
      <path d="M27 18h4v3h-4z" fill={color} />
    </>
  );
}

export function GolfClubHeadIcon({
  color,
  className,
  kind,
}: {
  color: string;
  className?: string;
  kind?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 32"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <ClubHead color={color} kind={kind} />
    </svg>
  );
}

export function GolfClubIcon({
  color,
  className,
  kind = 'iron',
}: {
  color: string;
  className?: string;
  kind?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 140"
      fill="none"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M31 27h6v107h-6z" fill="#17251e" />
      <path d="M33 29h2v102h-2z" fill="#dce3de" />
      <path d="M30 121h8v19h-8z" fill="#17251e" />
      <path d="M32 123h2v14h-2z" fill={color} />
      <ClubHead color={color} kind={kind} />
    </svg>
  );
}
