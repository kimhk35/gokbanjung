import { ensure, AppError } from "./errors";
import type { Actor } from "./types";

export function isCommunityPath(path: string) {
  return (
    path.startsWith("ward/") ||
    path.startsWith("think/") ||
    path.startsWith("notes/") ||
    path.startsWith("insight/") ||
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
    case "notes/verse-list":
      return (await import("./verse-notes")).listVerseNotes(a, params);
    case "notes/text-get":
      return (await import("./lesson-texts")).getLessonText(a, params);
    case "notes/text-list":
      return (await import("./lesson-texts")).listTextNotes(a, params);
    case "insight/today":
      return (await import("./daily-insight-service")).getDailyInsight(
        a,
        params,
      );
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
  const V = await import("./verse-notes");
  const T = await import("./lesson-texts");
  const I = await import("./daily-insight-service");
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
    "notes/verse-save": V.saveVerseNote,
    "notes/verse-delete": V.deleteVerseNote,
    "notes/verse-heart": V.toggleVerseHeart,
    "notes/verse-comment": V.addVerseComment,
    "notes/verse-comment-delete": V.deleteVerseComment,
    "notes/text-upload": T.saveLessonText,
    "notes/text-publish": T.setLessonTextStatus,
    "notes/text-save": T.saveTextNote,
    "notes/text-delete": T.deleteTextNote,
    "notes/text-heart": T.toggleTextHeart,
    "notes/text-comment": T.addTextComment,
    "notes/text-comment-delete": T.deleteTextComment,
    "insight/save": I.saveDailyInsight,
    "insight/reset": I.resetDailyInsight,
  };
  const handler = handlers[path];
  ensure(handler, 404, "not_found");
  return handler(a, input);
}
