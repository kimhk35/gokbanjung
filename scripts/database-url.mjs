// Cleans a pasted DATABASE_URL and explains mistakes in Korean.
// Returns { url, host } or { error }.
export function parseDatabaseUrl(raw) {
  let value = String(raw ?? "")
    .trim()
    .replace(/^DATABASE_URL\s*=\s*/, "")
    .trim();
  value = value.replace(/^["']|["']$/g, "").trim();
  if (!value)
    return {
      error:
        "값이 비어 있습니다. Vercel에서 DATABASE_URL의 값을 복사해 붙여 넣으세요.",
    };
  if (/^(DATABASE_URL)+$/.test(value))
    return {
      error:
        "이름(DATABASE_URL)만 복사되었습니다. 이름 옆의 값(postgresql://로 시작)을 복사하세요.",
    };
  const count = (value.match(/postgres(?:ql)?:\/\//g) || []).length;
  if (count > 1)
    return {
      error:
        "주소가 두 번 이상 붙여 넣어졌습니다. 창을 닫고 다시 실행해 한 번만 붙여 넣으세요.",
    };
  if (count === 0 || !/^postgres(?:ql)?:\/\//.test(value))
    return {
      error:
        "DATABASE_URL 값은 postgresql:// 로 시작해야 합니다. 다른 값을 복사한 것 같습니다.",
    };
  try {
    const host = new URL(value).hostname;
    if (!host.includes(".") && host !== "localhost") throw new Error("host");
    return { url: value, host };
  } catch {
    return {
      error:
        "올바른 주소 모양이 아닙니다. 값 전체를 빠짐없이 복사했는지 확인하세요.",
    };
  }
}
