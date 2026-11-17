import type { StudyTask, StudyTrack } from "./cfm-study-plan";

type PositionTask = Pick<
  StudyTask,
  | "id"
  | "path"
  | "sourceLang"
  | "sourceLanguageLocked"
  | "anchor"
  | "endAnchor"
  | "selectedIds"
>;
export type ReadingBoundary = "start" | "end";
export type StudyReaderPosition = {
  version: 1;
  taskId: string;
  sourceKey: string;
  boundary: ReadingBoundary;
};
type PositionOptions = {
  source?: string;
  anchor?: string;
  /** Undefined means server progress is still loading. */
  completed?: readonly string[];
};
type PositionStorage = Pick<Storage, "getItem" | "setItem">;

export function studyReaderPositionKey({
  actorId,
  week,
  day,
  track,
}: {
  actorId: string | null;
  week: number;
  day: number;
  track: StudyTrack;
}) {
  // A JSON tuple avoids ambiguous delimiters and keeps anonymous reading
  // separate from every signed-in or guest identity.
  return `ggc_study_reader_position:v1:${JSON.stringify([actorId, week, day, track])}`;
}

/** Pin the originating material into the current history entry before a related
 * link pushes another entry, even when both materials share one saved cursor.
 */
export function studyReaderReturnHref({
  week,
  day,
  track,
  task,
  boundary,
}: {
  week: number;
  day: number;
  track: StudyTrack;
  task: PositionTask;
  boundary: ReadingBoundary;
}) {
  const start = task.anchor || task.selectedIds[0] || "main";
  const anchor =
    boundary === "end"
      ? task.endAnchor || task.selectedIds.at(-1) || start
      : start;
  const query = new URLSearchParams({ track, source: task.path, anchor });
  return `/week/${week}/day/${day}?${query}`;
}

function sourceKey(task: PositionTask) {
  return JSON.stringify([
    task.path,
    task.sourceLang,
    !!task.sourceLanguageLocked,
    task.anchor,
    task.endAnchor,
    task.selectedIds,
  ]);
}

function positionFor(task: PositionTask, boundary: ReadingBoundary) {
  return {
    version: 1 as const,
    taskId: task.id,
    sourceKey: sourceKey(task),
    boundary,
  };
}

function validPosition(
  value: unknown,
  tasks: readonly PositionTask[],
): value is StudyReaderPosition {
  if (!value || typeof value !== "object") return false;
  const cursor = value as Partial<StudyReaderPosition>;
  if (
    cursor.version !== 1 ||
    typeof cursor.taskId !== "string" ||
    typeof cursor.sourceKey !== "string" ||
    (cursor.boundary !== "start" && cursor.boundary !== "end")
  )
    return false;
  const task = tasks.find((item) => item.id === cursor.taskId);
  return !!task && cursor.sourceKey === sourceKey(task);
}

/** Resolve once: explicit source link, unchanged saved task, then first unread.
 * A missing cursor must wait for progress instead of flashing the first source.
 * Completion is read-only here; restoring a position never marks anything read.
 */
export function resolveStudyReaderPosition(
  tasks: readonly PositionTask[],
  options: PositionOptions & { saved?: unknown },
): StudyReaderPosition | null {
  if (!tasks.length) return null;
  if (options.source && options.anchor) {
    const linked = tasks.find(
      (task) =>
        task.path === options.source &&
        ((task.anchor || "main") === options.anchor ||
          task.endAnchor === options.anchor ||
          task.selectedIds.includes(options.anchor!)),
    );
    if (linked) {
      const start = linked.anchor || linked.selectedIds[0] || "main";
      const end = linked.endAnchor || linked.selectedIds.at(-1) || start;
      return positionFor(
        linked,
        options.anchor === end && end !== start ? "end" : "start",
      );
    }
  }
  if (validPosition(options.saved, tasks)) return options.saved;
  if (options.completed === undefined) return null;
  const completed = new Set(options.completed);
  const unread = tasks.find((task) => !completed.has(task.id));
  return unread
    ? positionFor(unread, "start")
    : positionFor(tasks[tasks.length - 1], "end");
}

/** Device-only cursor store with an in-memory fallback when storage is blocked.
 * Each scope is resolved once per reader session; progress refreshes cannot
 * move a reader who has already resumed or chosen another material.
 */
export function createStudyReaderPositionSession(storage: PositionStorage) {
  const positions = new Map<string, StudyReaderPosition>();
  const listeners = new Set<() => void>();
  const remember = (key: string, position: StudyReaderPosition) => {
    positions.set(key, position);
    try {
      storage.setItem(key, JSON.stringify(position));
    } catch {}
    for (const listener of listeners) listener();
    return position;
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    current(key: string) {
      return positions.get(key) || null;
    },
    restore(
      key: string,
      tasks: readonly PositionTask[],
      options: PositionOptions,
    ) {
      const current = positions.get(key);
      if (validPosition(current, tasks)) return current;
      let saved: unknown;
      try {
        saved = JSON.parse(storage.getItem(key) || "null");
      } catch {}
      const position = resolveStudyReaderPosition(tasks, { ...options, saved });
      return position ? remember(key, position) : null;
    },
    select(
      key: string,
      tasks: readonly PositionTask[],
      taskId: string,
      boundary: ReadingBoundary = "start",
      expectedPosition?: StudyReaderPosition,
    ) {
      // A delayed Next-save must not undo a newer manual material/boundary
      // choice made while that request was in flight.
      if (expectedPosition && positions.get(key) !== expectedPosition)
        return null;
      const task = tasks.find((item) => item.id === taskId);
      return task ? remember(key, positionFor(task, boundary)) : null;
    },
  };
}
