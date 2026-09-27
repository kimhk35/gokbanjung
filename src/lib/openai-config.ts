import { AppError } from "./errors";

export function openAiKey() {
  return process.env.OPENAI_API_KEY?.trim() || process.env.OPEN_API_KEY?.trim();
}
export function openAiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
}
export async function openAiRequest(
  body: Record<string, unknown>,
  timeout = 45000,
) {
  const key = openAiKey();
  if (!key) throw new AppError(503, "ai_unavailable");
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (e) {
    throw new AppError(
      502,
      e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name)
        ? "ai_timeout"
        : "ai_connection_failed",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const code = data?.error?.code;
    if (response.status === 401) throw new AppError(502, "ai_key_invalid");
    if (code === "insufficient_quota")
      throw new AppError(502, "ai_quota_exceeded");
    if (response.status === 429) throw new AppError(503, "ai_rate_limited");
    if (response.status === 403) throw new AppError(502, "ai_access_denied");
    if (response.status === 404 || code === "model_not_found")
      throw new AppError(502, "ai_model_invalid");
    throw new AppError(
      502,
      response.status >= 500 ? "ai_provider_unavailable" : "ai_request_invalid",
    );
  }
  return response;
}
export async function checkAiConnection() {
  const model = openAiModel();
  const response = await openAiRequest({
    model,
    messages: [{ role: "user", content: 'Return JSON: {"connected":true}' }],
    response_format: { type: "json_object" },
    max_completion_tokens: 256,
  });
  const data = await response.json();
  let content;
  try {
    content = JSON.parse(data.choices?.[0]?.message?.content);
  } catch {
    throw new AppError(502, "ai_failed");
  }
  if (content.connected !== true) throw new AppError(502, "ai_failed");
  return { ok: true, model, checkedAt: new Date().toISOString() };
}
