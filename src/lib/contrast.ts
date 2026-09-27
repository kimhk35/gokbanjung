// WCAG 2.x contrast ratio between two #rrggbb colors.
const channel = (v: number) =>
  v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((x) =>
    channel(x / 255),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
