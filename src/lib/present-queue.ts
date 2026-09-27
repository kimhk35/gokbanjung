// Teacher's presentation queue: an ordered list of reply ids (device-only).
export function toggle(queue: string[], id: string) {
  return queue.includes(id) ? queue.filter((x) => x !== id) : [...queue, id];
}
export function move(queue: string[], id: string, delta: -1 | 1) {
  const from = queue.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= queue.length) return queue;
  const next = [...queue];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
// Queue order, silently dropping replies that were deleted since queuing.
export function resolve<T extends { id: string }>(queue: string[], replies: T[]) {
  const byId = new Map(replies.map((r) => [r.id, r]));
  return queue.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
export type Slide<T> = { kind: "question" } | { kind: "reply"; reply: T };
export function slides<T>(queued: T[]): Slide<T>[] {
  return [{ kind: "question" }, ...queued.map((reply) => ({ kind: "reply" as const, reply }))];
}
