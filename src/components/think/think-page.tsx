"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MessageCircle } from "lucide-react";
import { useApp } from "../provider";
import { PageTitle, Empty } from "../learning/learn";
import { api } from "@/lib/client";
import type { Prompt } from "@/lib/prompts";
import { useRefresh } from "../use-refresh";
import { PromptEditor } from "./prompt-editor";
import { PromptView } from "./prompt-view";
import { when } from "./reply-item";
import { authorLabel } from "@/lib/author-label";

export function ThinkPage() {
  const { locale, tl, t, lang, weeks, boot, error } = useApp();
  const [week, setWeek] = useState<string>("");
  const [data, setData] = useState<{
    items: Prompt[];
    canAuthor: boolean;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const load = useCallback(() => {
    api<{ items: Prompt[]; canAuthor: boolean }>(
      `think/prompts${week ? `?week=${week}` : ""}`,
    )
      .then(setData)
      .catch(error);
  }, [week, error]);
  useEffect(() => {
    if (boot) load();
  }, [boot, load]);
  useRefresh(load, 30000, editing);
  const open = (e: React.MouseEvent, slug: string) => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      e.preventDefault();
      setSelected(slug);
    }
  };
  return (
    <div className="page think-page">
      <PageTitle
        eyebrow="SHARE · THINK TOGETHER"
        title={t("함께 생각하기", "Think together")}
        description={t(
          "선생님이 올린 질문을 읽고, 로그인 없이 생각을 나눠요.",
          "Read a question and share your thoughts — no sign-in needed.",
        )}
      />
      <div className="ward-toolbar">
        <label className="week-picker">
          {t("주차", "Week")}
          <select
            value={week}
            onChange={(e) => {
              setWeek(e.target.value);
              setSelected(null);
            }}
          >
            <option value="">{t("전체", "All")}</option>
            {weeks.map((w) => (
              <option key={w.number} value={w.number}>
                {w.number}. {tl(w.title)}
              </option>
            ))}
          </select>
        </label>
        {data?.canAuthor && (
          <button
            type="button"
            className="button"
            onClick={() => setEditing(true)}
          >
            <Plus size={18} /> {t("새 질문", "New question")}
          </button>
        )}
      </div>
      {!data ? (
        <div className="skeleton" />
      ) : !data.items.length ? (
        <Empty
          title={t("아직 올라온 질문이 없습니다.", "No questions yet.")}
          body={t(
            "선생님이 질문을 올리면 여기에 보여요.",
            "Questions from teachers will appear here.",
          )}
        />
      ) : (
        <div className={`think-split${selected ? " has-selection" : ""}`}>
          <div className="prompt-list">
            {data.items.map((p) => (
              <Link
                key={p.id}
                href={`/p/${p.slug}`}
                className="prompt-card"
                aria-current={selected === p.slug ? "true" : undefined}
                onClick={(e) => open(e, p.slug)}
              >
                <span className="overline">
                  {p.reference_label ||
                    (p.week ? t(`${p.week}주차`, `Week ${p.week}`) : "")}
                </span>
                <h3>{p.title}</h3>
                <p>
                  {p.question.length > 90
                    ? p.question.slice(0, 90) + "…"
                    : p.question}
                </p>
                <small className="muted">
                  <MessageCircle size={14} /> {p.reply_count} · {authorLabel(p.author, t)} ·{" "}
                  {when(p.created_at, locale)}
                </small>
              </Link>
            ))}
          </div>
          <div className="prompt-pane">
            {selected ? (
              <PromptView key={selected} slug={selected} embedded />
            ) : (
              <p className="muted pane-hint">
                {t(
                  "왼쪽에서 질문을 고르면 여기에서 답글을 볼 수 있어요.",
                  "Pick a question to see replies here.",
                )}
              </p>
            )}
          </div>
        </div>
      )}
      <PromptEditor
        open={editing}
        onOpenChange={setEditing}
        prompt={null}
        onSaved={() => load()}
      />
    </div>
  );
}
