"use client";
import { useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { useApp } from "./provider";

// Poster bytes from the deleted Supabase storage cannot be restored, so a stored
// path may point at nothing. Replace the broken image with a short notice (or the
// given fallback) instead of the browser's broken-image icon.
export function PosterImage({
  src,
  alt,
  className,
  loading,
  editing = false,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  editing?: boolean;
  fallback?: ReactNode;
}) {
  const { t } = useApp();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <p className={`poster-missing ${className || ""}`} role="note">
        <ImageOff size={18} aria-hidden />
        {editing
          ? t(
              "포스터 이미지를 불러올 수 없습니다. 다시 올려 주세요.",
              "The poster image is unavailable. Please upload it again.",
            )
          : t(
              "포스터 이미지를 불러올 수 없습니다.",
              "The poster image is unavailable.",
            )}
      </p>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailedSrc(src)}
    />
  );
}
