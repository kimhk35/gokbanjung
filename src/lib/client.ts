export class RequestError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export async function api<T = unknown>(
  path: string,
  input?: unknown,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method: input === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: input === undefined ? {} : { "Content-Type": "application/json" },
    body: input === undefined ? undefined : JSON.stringify(input),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error || "server_error");
  return data;
}
