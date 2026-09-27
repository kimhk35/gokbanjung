import { ensure, AppError } from "./errors";
import type { Actor } from "./types";

export function isCommunityPath(path: string) {
  return (
    path.startsWith("ward/") ||
    path.startsWith("think/") ||
    path === "home/activity"
  );
}
export async function communityRead(
  a: Actor | null,
  path: string,
  params: URLSearchParams,
) {
  const W = await import("./ward-events");
  const P = await import("./prompts");
  switch (path) {
    case "ward/events":
      return W.listEvents(a, params);
    case "ward/event":
      return W.getEvent(a, params.get("slug") || "");
    case "ward/managers":
      ensure(a, 401, "session_required");
      return W.listEventManagers(a);
    case "think/prompts":
      return P.listPrompts(a, params);
    case "think/prompt":
      return P.getPrompt(a, params.get("slug") || "");
    case "home/activity":
      return {
        events: await W.upcomingEvents(3),
        ...(await P.recentActivity()),
      };
    default:
      throw new AppError(404, "not_found");
  }
}
// Community writes skip gospel-class's nickname requirement on purpose:
// comefollowme lets anyone reply, heart or comment and shows "익명".
export async function communityWrite(a: Actor, path: string, input: unknown) {
  const { rateLimit } = await import("./service");
  await rateLimit("community:" + a.id, 120, 60);
  const W = await import("./ward-events");
  const P = await import("./prompts");
  const handlers: Record<
    string,
    (a: Actor, input: unknown) => Promise<unknown>
  > = {
    "ward/save": W.saveEvent,
    "ward/status": W.setEventStatus,
    "ward/delete": W.deleteEvent,
    "ward/manager": W.setEventManager,
    "think/save": P.savePrompt,
    "think/delete": P.deletePrompt,
    "think/reply": P.addReply,
    "think/reply-delete": P.deleteReply,
    "think/comment": P.addReplyComment,
    "think/comment-delete": P.deleteReplyComment,
    "think/heart": P.toggleHeart,
  };
  const handler = handlers[path];
  ensure(handler, 404, "not_found");
  return handler(a, input);
}
