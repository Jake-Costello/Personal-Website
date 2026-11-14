import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CARD_ART } from './encore-art-registry';
import type { ArtAsset } from './encore-art-registry';
export function ReplaceableArtwork({
  asset,
  fallback = null,
  className = '',
  label = '',
}: {
  asset?: ArtAsset;
  fallback?: ReactNode;
  className?: string;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [asset?.src]);
  if (!asset || failed) return fallback;
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}${asset.src}`}
      alt={label}
      data-rendering={asset.rendering}
      style={{ objectPosition: asset.position ?? '50% 50%' }}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
export default function CardArtwork({
  artKey,
  className = 'db-card-art',
}: {
  artKey: string;
  className?: string;
}) {
  const fallback = (
    <svg className={className} viewBox="0 0 32 40" aria-hidden="true">
      <path
        d="M10 29c-7-4-1-11 4-7V8l12-3v17c0 8-13 7-11 0 1-3 5-4 8-2V10l-6 2v15c0 6-6 7-7 2Z"
        fill="currentColor"
      />
    </svg>
  );
  return <ReplaceableArtwork asset={CARD_ART[artKey]} fallback={fallback} className={className} />;
}
