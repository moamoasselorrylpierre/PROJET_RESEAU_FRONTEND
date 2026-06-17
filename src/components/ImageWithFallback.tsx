"use client";
// ============================================================
//  KamerStay — components/ImageWithFallback.tsx
//  <img> avec image de secours si le chargement échoue.
//  Remplace le helper Figma "components/figma/ImageWithFallback".
// ============================================================

import { useState, ImgHTMLAttributes } from "react";

const FALLBACK =
  "https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=1200&q=80";

export function ImageWithFallback({
  src,
  alt = "",
  fallback = FALLBACK,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { fallback?: string }) {
  const [err, setErr] = useState(false);
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={err || !src ? fallback : (src as string)}
      alt={alt}
      onError={() => setErr(true)}
      {...props}
    />
  );
}

export default ImageWithFallback;
