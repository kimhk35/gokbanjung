"use client";
import { cardBackgrounds, cardBackgroundUrl } from "@/lib/card-backgrounds";
import { useApp } from "./provider";
export function BackgroundPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { tl, lang, t } = useApp();
  return (
    <details className="background-picker">
      <summary>
        {t(
          "종교적 배경 20종 보기 · 십자가 없음",
          "Browse 20 faith backgrounds · no crosses",
        )}
      </summary>
      <div
        className="background-grid"
        aria-label={t("카드 배경 선택", "Choose a card background")}
      >
        {cardBackgrounds.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={value === item.id}
            disabled={disabled}
            onClick={() => onChange(item.id)}
          >
            <img src={cardBackgroundUrl(item.id)!} alt="" loading="lazy" />
            <span>{tl(item)}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
