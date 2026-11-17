"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { StudyTask, StudyTrack } from "@/lib/cfm-study-plan";
import {
  createStudyReaderPositionSession,
  studyReaderPositionKey,
  type ReadingBoundary,
  type StudyReaderPosition,
} from "@/lib/study-reader-position";

const serverPosition = () => null;

export function useStudyReaderPosition({
  actorId,
  identityReady,
  week,
  day,
  track,
  tasks,
  completed,
  source,
  anchor,
}: {
  actorId: string | null;
  identityReady: boolean;
  week: number;
  day: number;
  track: StudyTrack;
  tasks: StudyTask[];
  completed: readonly string[] | undefined;
  source?: string;
  anchor?: string;
}) {
  const [session] = useState(() =>
    createStudyReaderPositionSession({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    }),
  );
  const key = identityReady
    ? studyReaderPositionKey({ actorId, week, day, track })
    : null;
  const getPosition = useCallback(
    () => (key ? session.current(key) : null),
    [session, key],
  );
  const position = useSyncExternalStore(
    session.subscribe,
    getPosition,
    serverPosition,
  );
  useEffect(() => {
    if (key) session.restore(key, tasks, { completed, source, anchor });
  }, [session, key, tasks, completed, source, anchor]);

  const select = (
    taskId: string,
    boundary: ReadingBoundary = "start",
    expectedPosition?: StudyReaderPosition,
  ) => {
    if (key) session.select(key, tasks, taskId, boundary, expectedPosition);
  };
  return { position, select };
}
