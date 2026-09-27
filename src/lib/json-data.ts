/** Decode legacy JSON containers without changing ordinary text or scalar settings. */
export function decodeJsonContainer(value: unknown): unknown {
  let decoded = value;
  for (let depth = 0; depth < 4 && typeof decoded === "string"; depth++) {
    try {
      decoded = JSON.parse(decoded);
    } catch {
      return value;
    }
  }
  return decoded !== null && typeof decoded === "object" ? decoded : value;
}

/** DB.query uses encoded JSON strings, just like PGlite's parameter interface. */
export const databaseJsonType = {
  to: 114,
  from: [114, 3802],
  serialize: (value: unknown): string =>
    typeof value === "string" ? value : JSON.stringify(value),
  parse: (text: string): unknown => decodeJsonContainer(JSON.parse(text)),
};
