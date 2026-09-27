"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Download, Printer, LockKeyhole } from "lucide-react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { useDraft } from "../use-draft";
import { fields, currentWeek } from "@/lib/curriculum";
import { PageTitle, WeekPicker, Empty } from "./learn";
import { Modal } from "../ui/dialog";
import type { Localized, Submission } from "@/lib/types";
export function WorksheetPage() {
  const { t } = useApp();
  const params = useSearchParams();
  const [week, setWeek] = useState(
    Number(params.get("week")) || currentWeek()?.number || 38,
  );
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow="READ · THINK · SHARE · LIVE"
        title={t("이번 주를 담는 활동지", "A place to gather your week")}
        description={t(
          "생각의 변화와 작은 실천을 기록해 보세요.",
          "Make room for new thoughts and small acts of practice.",
        )}
      />
      <WeekPicker week={week} onChange={setWeek} />
      <Worksheet key={week} week={week} />
    </div>
  );
}
function Worksheet({ week }: { week: number }) {
  const { tl, locale, t, lang, boot, weeks, error, notify } = useApp();
  const [initial, setInitial] = useState<Record<string, string>>();
  const [version, setVersion] = useState(0);
  const [previousDraft, setPreviousDraft] = useState<{
    answers: Record<string, string>;
    worksheet_snapshot?: { items: Localized[]; version: number };
  } | null>(null);
  const [items, setItems] = useState<Localized[]>(fields);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [open, setOpen] = useState(false);
  const [teacher, setTeacher] = useState(boot?.actor.teacher_id || "");
  const [busy, setBusy] = useState(false);
  const w = weeks.find((w) => w.number === week)!;
  const load = () =>
    api<{
      worksheet?: { items: Localized[]; version: number };
      draft?: {
        answers: Record<string, string>;
        worksheet_snapshot?: { items: Localized[]; version: number };
      };
      submissions: Submission[];
    }>(`worksheet?week=${week}`).then((d) => {
      const current = d.worksheet?.version || 1;
      const changed =
        !!d.draft && (d.draft.worksheet_snapshot?.version || 1) !== current;
      setInitial(changed ? {} : d.draft?.answers || {});
      if (changed) setPreviousDraft(d.draft!);
      if (d.worksheet) {
        setItems(d.worksheet.items);
        setVersion(current);
      }

      setSubmissions(d.submissions);
    });
  useEffect(() => {
    if (boot) load().catch(error);
  }, [boot, week]);
  const draft = useDraft(
    `worksheet:${week}:v${version}`,
    "draft",
    { week, worksheet_version: version },
    initial,
  );
  const submit = async () => {
    setBusy(true);
    try {
      await api("submit", {
        week,
        teacher_id: teacher,
        answers: draft.value,
        worksheet_version: version,
      });
      setOpen(false);
      await load();
      notify(
        t(
          "교사에게 활동지를 제출했습니다.",
          "Your worksheet was submitted to your teacher.",
        ),
      );
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const pdf = async () => {
    setBusy(true);
    try {
      const { worksheetPdf } = await import("@/lib/export");
      await worksheetPdf({
        title: tl(w.title),
        reference: tl(w.reference),
        items: items.map((p) => tl(p)),
        answers: draft.value,
        lang,
        week,
      });
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  const statuses: Record<string, Localized> = {
    SUBMITTED: { ko: "제출 완료", en: "Submitted" },
    VIEWED: { ko: "교사 확인", en: "Viewed" },
    FEEDBACK: { ko: "피드백 도착", en: "Feedback received" },
    RETURNED: { ko: "수정 후 재제출", en: "Returned for revision" },
  };
  return (
    <>
      <div className="worksheet-toolbar">
        <div>
          <h2>{tl(w.reference)}</h2>
          <p className="private">
            <LockKeyhole size={15} />
            {t(
              "제출 전까지 나만 볼 수 있습니다.",
              "Only you can see this until you submit.",
            )}
          </p>
        </div>
        <div className="actions">
          <button className="button secondary" onClick={pdf} disabled={busy}>
            <Download size={17} />
            {t("PDF 내려받기", "Download PDF")}
          </button>
          <button
            className="icon-button"
            aria-label={t("인쇄", "Print")}
            onClick={() => window.print()}
          >
            <Printer size={21} />
          </button>
        </div>
      </div>
      {previousDraft && (
        <details className="panel">
          <summary>
            {t(
              "학습지 문항이 변경되었습니다. 이전 초안 확인",
              "Worksheet updated. View your previous draft",
            )}
          </summary>
          <p>
            {t(
              "문항 순서가 달라질 수 있어 답안을 자동으로 옮기지 않았습니다. 필요한 내용을 복사해 새 문항에 작성하세요.",
              "Answers were not moved automatically because questions may have changed. Copy relevant text into the new worksheet.",
            )}
          </p>
          {Object.entries(previousDraft.answers).map(([k, v]) => (
            <div key={k}>
              <strong>
                {tl(previousDraft.worksheet_snapshot?.items[Number(k)]) || k}
              </strong>
              <p style={{ whiteSpace: "pre-wrap" }}>{v}</p>
            </div>
          ))}
        </details>
      )}
      <div className="worksheet-paper">
        <div className="paper-header">
          <span>WEEK {week}</span>
          <strong>{tl(w.title)}</strong>
        </div>
        {items.map((p, i) => (
          <label className="field" key={i}>
            <span className="item-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            {tl(p)}
            <textarea
              value={draft.value[String(i)] || ""}
              onChange={(e) => draft.change(String(i), e.target.value)}
              rows={3}
              disabled={!version}
            />
          </label>
        ))}
      </div>
      <div className="submit-bar">
        <p className="save-status" role="status">
          {draft.status}
        </p>
        <button
          className="button primary"
          disabled={!version}
          onClick={() => setOpen(true)}
        >
          <Send size={17} />
          {t("교사에게 제출", "Submit to a teacher")}
        </button>
      </div>
      <section>
        <h2>{t("나의 제출 기록", "My submissions")}</h2>
        {submissions.length ? (
          submissions.map((s) => (
            <article className="submission-card" key={s.id}>
              <div className="section-heading">
                <strong>{tl(statuses[s.status]) || s.status}</strong>
                <time>{new Date(s.created_at).toLocaleString(locale)}</time>
              </div>
              <p>
                {boot?.teachers.find((t) => t.id === s.teacher_id)?.nickname ||
                  t("담당 교사", "Assigned teacher")}
              </p>
              {s.feedback?.map((f, i) => (
                <blockquote key={i}>
                  <span className="overline">
                    {t("선생님의 생각", "FROM YOUR TEACHER")}
                  </span>
                  <p>{f.content}</p>
                </blockquote>
              ))}
            </article>
          ))
        ) : (
          <Empty
            title={t(
              "아직 제출한 활동지가 없습니다.",
              "No worksheets submitted yet.",
            )}
          />
        )}
      </section>
      <Modal
        title={t("제출할 교사를 선택하세요", "Choose your teacher")}
        description={t(
          "제출한 활동지는 선택한 교사와 관리자만 확인할 수 있습니다. 개인 묵상은 함께 제출되지 않습니다.",
          "Your selected teacher and administrator can read the submitted worksheet. Private reflections are not included.",
        )}
        open={open}
        onOpenChange={setOpen}
      >
        {boot?.teachers.length ? (
          <>
            <label className="field">
              {t("담당 교사", "Teacher")}
              <select
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              >
                <option value="">{t("교사 선택", "Choose a teacher")}</option>
                {boot.teachers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!teacher || busy}
              className="button primary"
              onClick={submit}
            >
              {t("제출하기", "Submit")}
            </button>
          </>
        ) : (
          <Empty
            title={t(
              "아직 승인된 교사가 없습니다.",
              "No teachers have been approved yet.",
            )}
            body={t(
              "관리자가 교사를 승인하면 여기에서 선택할 수 있습니다. 작성 내용은 계속 저장됩니다.",
              "Approved teachers will appear here. You can keep writing and saving your draft.",
            )}
          />
        )}
      </Modal>
    </>
  );
}
