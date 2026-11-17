import test from "node:test";
import assert from "node:assert/strict";
import {
  createStudyReaderPositionSession,
  resolveStudyReaderPosition,
  studyReaderPositionKey,
  studyReaderReturnHref,
} from "../src/lib/study-reader-position";

const tasks = [
  {
    id: "manual",
    path: "/manual",
    sourceLang: "kor",
    anchor: "p1",
    endAnchor: "p3",
    selectedIds: ["p1", "p2", "p3"],
  },
  {
    id: "scripture",
    path: "/scripture",
    sourceLang: "kor",
    anchor: "p4",
    endAnchor: "p9",
    selectedIds: ["p4", "p5", "p9"],
  },
  {
    id: "talk",
    path: "/talk",
    sourceLang: "kor",
    anchor: "p1",
    endAnchor: "p8",
    selectedIds: ["p1", "p8"],
  },
];
const scope = { actorId: "guest-a", week: 47, day: 1, track: "adult" as const };
const key = studyReaderPositionKey(scope);
function memoryStorage() {
  const values = new Map<string, string>();
  const writes: string[] = [];
  return {
    values,
    writes,
    getItem: (key: string) => values.get(key) || null,
    setItem(key: string, value: string) {
      writes.push(key);
      values.set(key, value);
    },
  };
}

test("a valid explicit source/anchor wins over saved and unread positions", () => {
  const saved = resolveStudyReaderPosition(tasks, { completed: ["manual"] });
  const linked = resolveStudyReaderPosition(tasks, {
    saved,
    source: "/talk",
    anchor: "p1",
    completed: [],
  });
  assert.equal(linked?.taskId, "talk");
  assert.equal(linked?.boundary, "start");
  assert.equal(
    resolveStudyReaderPosition(tasks, { source: "/talk", anchor: "p8" })
      ?.boundary,
    "end",
  );
  assert.equal(
    resolveStudyReaderPosition(tasks, {
      saved,
      source: "/missing",
      anchor: "p1",
    })?.taskId,
    "scripture",
  );
});

test("a whole-player link with main opens the video instead of a saved reading", () => {
  const video = {
    ...tasks[2],
    id: "video",
    path: "/video",
    anchor: "",
    endAnchor: "",
    selectedIds: [],
  };
  const saved = resolveStudyReaderPosition(tasks, { completed: ["manual"] });
  assert.equal(
    resolveStudyReaderPosition([...tasks, video], {
      saved,
      source: "/video",
      anchor: "main",
      completed: [],
    })?.taskId,
    "video",
  );
});

test("a saved stable task ID survives reordering and restores the chosen boundary", () => {
  const storage = memoryStorage();
  createStudyReaderPositionSession(storage).select(
    key,
    tasks,
    "scripture",
    "end",
  );
  const raw = storage.values.get(key);
  const restored = createStudyReaderPositionSession(storage).restore(
    key,
    [tasks[2], tasks[0], tasks[1]],
    {},
  );
  assert.equal(restored?.taskId, "scripture");
  assert.equal(restored?.boundary, "end");
  assert.equal(
    storage.values.get(key),
    raw,
    "initial mount must not replace a saved task with index zero",
  );
});

test("actor, week, day and track cursors are isolated, including anonymous reading", () => {
  const scopes = [
    scope,
    { ...scope, actorId: "member-b" },
    { ...scope, actorId: null },
    { ...scope, actorId: "null" },
    { ...scope, week: 46 },
    { ...scope, day: 2 },
    { ...scope, track: "family" as const },
  ];
  const keys = scopes.map(studyReaderPositionKey);
  assert.equal(new Set(keys).size, scopes.length);
  const storage = memoryStorage();
  const session = createStudyReaderPositionSession(storage);
  keys.forEach((entry, index) =>
    session.select(entry, tasks, tasks[index % tasks.length].id),
  );
  const reopened = createStudyReaderPositionSession(storage);
  keys.forEach((entry, index) =>
    assert.equal(
      reopened.restore(entry, tasks, {})?.taskId,
      tasks[index % tasks.length].id,
    ),
  );
});

test("deleted tasks or changed source boundaries wait for progress, then fall back to first unread", () => {
  const saved = resolveStudyReaderPosition(tasks, { completed: ["manual"] });
  const changed = [
    tasks.filter((task) => task.id !== "scripture"),
    tasks.map((task) =>
      task.id === "scripture" ? { ...task, path: "/new-source" } : task,
    ),
    tasks.map((task) =>
      task.id === "scripture" ? { ...task, endAnchor: "p10" } : task,
    ),
    tasks.map((task) =>
      task.id === "scripture"
        ? { ...task, selectedIds: ["p4", "p6", "p9"] }
        : task,
    ),
    tasks.map((task) =>
      task.id === "scripture" ? { ...task, sourceLang: "eng" } : task,
    ),
  ];
  for (const allocation of changed) {
    assert.equal(resolveStudyReaderPosition(allocation, { saved }), null);
    assert.equal(
      resolveStudyReaderPosition(allocation, {
        saved,
        completed: ["manual", "scripture"],
      })?.taskId,
      "talk",
    );
  }
});

test("missing/corrupt cursor is not overwritten before progress arrives", () => {
  const storage = memoryStorage();
  storage.values.set(key, "not-json");
  const session = createStudyReaderPositionSession(storage);
  assert.equal(session.restore(key, tasks, {}), null);
  assert.equal(storage.values.get(key), "not-json");
  assert.equal(storage.writes.length, 0);
  const completed = ["manual"];
  assert.equal(session.restore(key, tasks, { completed })?.taskId, "scripture");
  assert.deepEqual(
    completed,
    ["manual"],
    "restoration must never complete another material",
  );
  assert.equal(storage.writes.length, 1);
});

test("progress refreshes and switching away/back cannot jump an already resumed reader", () => {
  const storage = memoryStorage();
  const session = createStudyReaderPositionSession(storage);
  const adult = session.restore(key, tasks, { completed: ["manual"] });
  const family = studyReaderPositionKey({ ...scope, track: "family" });
  session.select(family, tasks, "talk", "end");
  assert.equal(
    session.restore(key, tasks, { completed: ["manual", "scripture"] }),
    adult,
  );
  assert.equal(
    session.restore(family, tasks, { completed: [] })?.taskId,
    "talk",
  );
  assert.equal(
    session.restore(family, tasks, { completed: [] })?.boundary,
    "end",
  );
});

test("a manual choice while progress is pending wins over the late response and original deep link", () => {
  const storage = memoryStorage();
  const session = createStudyReaderPositionSession(storage);
  assert.equal(session.restore(key, tasks, {}), null);
  const chosen = session.select(key, tasks, "talk");
  assert.equal(
    session.restore(key, tasks, {
      completed: [],
      source: "/manual",
      anchor: "p1",
    }),
    chosen,
  );
  assert.equal(
    createStudyReaderPositionSession(storage).restore(key, tasks, {})?.taskId,
    "talk",
  );
});

test("storage access failures retain per-track session positions without blocking reading", () => {
  const session = createStudyReaderPositionSession({
    getItem() {
      throw new Error("Storage blocked");
    },
    setItem() {
      throw new Error("Storage quota");
    },
  });
  assert.equal(
    session.restore(key, tasks, { completed: ["manual"] })?.taskId,
    "scripture",
  );
  session.select(key, tasks, "talk", "end");
  const family = studyReaderPositionKey({ ...scope, track: "family" });
  session.select(family, tasks, "manual");
  assert.equal(session.restore(key, tasks, { completed: [] })?.taskId, "talk");
  assert.equal(session.current(key)?.boundary, "end");
});

test("a delayed Next response cannot overwrite a newer material or boundary choice", () => {
  const session = createStudyReaderPositionSession(memoryStorage());
  const startingPosition = session.restore(key, tasks, { completed: [] })!;
  const newer = session.select(key, tasks, "talk", "end");
  assert.equal(
    session.select(key, tasks, "scripture", "start", startingPosition),
    null,
  );
  assert.equal(session.current(key), newer);
  const advanced = session.select(key, tasks, "scripture", "start", newer!);
  assert.equal(advanced?.taskId, "scripture");
});

test("all completed returns the final boundary, while empty allocations and invalid saved formats are safe", () => {
  assert.deepEqual(resolveStudyReaderPosition([], { completed: [] }), null);
  const last = resolveStudyReaderPosition(tasks, {
    completed: tasks.map((task) => task.id),
  });
  assert.equal(last?.taskId, "talk");
  assert.equal(last?.boundary, "end");
  for (const saved of [
    null,
    [],
    "bad",
    3,
    { ...last, version: 2 },
    { ...last, boundary: "middle" },
  ]) {
    assert.equal(resolveStudyReaderPosition(tasks, { saved }), null);
    assert.equal(
      resolveStudyReaderPosition(tasks, { saved, completed: [] })?.taskId,
      "manual",
    );
  }
});

test("listeners only notify resolved changes and unsubscribe cleanly", () => {
  const session = createStudyReaderPositionSession(memoryStorage());
  let notifications = 0;
  const stop = session.subscribe(() => notifications++);
  session.restore(key, tasks, {});
  assert.equal(notifications, 0);
  session.restore(key, tasks, { completed: [] });
  session.restore(key, tasks, { completed: ["manual"] });
  assert.equal(notifications, 1);
  session.select(key, tasks, "scripture");
  assert.equal(notifications, 2);
  stop();
  session.select(key, tasks, "talk");
  assert.equal(notifications, 2);
});

test("related navigation pins an origin URL that wins over the target's same-day cursor on Back", () => {
  const storage = memoryStorage();
  const session = createStudyReaderPositionSession(storage);
  session.select(key, tasks, "manual", "end");
  const origin = studyReaderReturnHref({
    ...scope,
    task: tasks[0],
    boundary: "end",
  });
  session.select(key, tasks, "talk");
  const url = new URL(origin, "http://localhost");
  assert.equal(url.pathname, "/week/47/day/1");
  assert.equal(url.searchParams.get("track"), "adult");
  assert.equal(url.searchParams.get("anchor"), "p3");
  const returned = createStudyReaderPositionSession(storage).restore(
    key,
    tasks,
    {
      source: url.searchParams.get("source")!,
      anchor: url.searchParams.get("anchor")!,
    },
  );
  assert.equal(returned?.taskId, "manual");
  assert.equal(returned?.boundary, "end");
});

test("return links use safe encoded source paths and usable anchors for every material kind", () => {
  for (const boundary of ["start", "end"] as const) {
    const task = {
      ...tasks[0],
      path: "/media/video?id=1&title=faith",
      anchor: "",
      endAnchor: "",
      selectedIds: [],
    };
    const url = new URL(
      studyReaderReturnHref({ ...scope, task, boundary }),
      "http://localhost",
    );
    assert.equal(url.searchParams.get("source"), task.path);
    assert.equal(url.searchParams.get("anchor"), "main");
    assert.equal(
      resolveStudyReaderPosition([task], { source: task.path, anchor: "main" })
        ?.taskId,
      task.id,
    );
  }
  const selectedOnly = { ...tasks[0], anchor: "", endAnchor: "" };
  const url = new URL(
    studyReaderReturnHref({ ...scope, task: selectedOnly, boundary: "end" }),
    "http://localhost",
  );
  assert.equal(
    resolveStudyReaderPosition([selectedOnly], {
      source: selectedOnly.path,
      anchor: url.searchParams.get("anchor")!,
    })?.boundary,
    "end",
  );
});
