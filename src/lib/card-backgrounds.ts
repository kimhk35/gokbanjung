import backgrounds from "../data/card-backgrounds.json";
export const cardBackgrounds = backgrounds;
export function cardBackgroundUrl(id: string) {
  return backgrounds.some((item) => item.id === id)
    ? `/card-backgrounds/${id}.svg`
    : null;
}
const images = new Map<string, Promise<HTMLImageElement>>();
export function loadCardBackground(id: string): Promise<HTMLImageElement> {
  const url = cardBackgroundUrl(id);
  if (!url) return Promise.reject(new Error("invalid_background"));
  let loading = images.get(url);
  if (!loading) {
    loading = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        images.delete(url);
        reject(new Error("background_unavailable"));
      };
      image.src = url;
    });
    images.set(url, loading);
  }
  return loading;
}
