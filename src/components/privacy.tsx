"use client";
import { useState, useEffect } from "react";
import { useApp } from "./provider";
import { PageTitle } from "./learning/learn";
import { Confirm } from "./ui/dialog";
import { api } from "@/lib/client";
import { RecordsGate } from "./account";
export function PrivacyPage() {
  const { t, boot, error, reload, notify } = useApp();
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  useEffect(() => {
    setName(boot?.actor.nickname || "");
    setTeacher(boot?.actor.teacher_id || "");
  }, [boot]);
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow={t("나의 기록 관리", "MY RECORDS & PRIVACY")}
        title={t("내 생각은 나의 것입니다", "Your thoughts belong to you")}
      />
      <RecordsGate>
        <section className="panel">
          <h2>{t("참여 정보", "Participation details")}</h2>
          <label className="field">
            {t("닉네임", "Nickname")}
            <input
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            {t("담당 교사 (선택)", "Teacher (optional)")}
            <select
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            >
              <option value="">{t("선택하지 않음", "Not selected")}</option>
              {boot?.teachers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </label>
          <p className="field-help">
            {t(
              "선택한 교사의 반원 목록에 표시되며, 해당 교사와 관리자는 학습 완료·활동지 제출·퀴즈 통계를 볼 수 있습니다. 개인 묵상 내용은 공유되지 않습니다.",
              "Your selected teacher can see you in their class list. That teacher and administrators can view completion, submission and quiz statistics. Private reflections remain private.",
            )}
          </p>
          <button
            className="button primary"
            onClick={() =>
              api("profile", { nickname: name, teacher_id: teacher || null })
                .then(reload)
                .then(() =>
                  notify(
                    t(
                      "참여 정보를 저장했습니다.",
                      "Your participation details were saved.",
                    ),
                  ),
                )
                .catch(error)
            }
          >
            {t("저장", "Save")}
          </button>
        </section>
      </RecordsGate>
      <section className="prose">
        <h2>{t("기록의 공개 범위", "Who can see your records")}</h2>
        <p>
          {t(
            "개인 묵상은 본인만 읽고 수정할 수 있으며, 교사와 관리자에게 보이지 않습니다. 생각벽과 토론에 직접 게시한 글만 반에서 공유됩니다.",
            "Only you can read and edit your private reflections. Teachers and administrators cannot see them. Only what you post to the thought wall or discussions is shared with the class.",
          )}
        </p>
        <p>
          {t(
            "제출한 활동지는 선택한 교사와 관리자에게 보입니다. 제출되지 않은 활동지 초안은 본인만 볼 수 있습니다. 이름 없이 참여할 수 있으며 전화번호, 주소, 생년월일은 수집하지 않습니다.",
            "Submitted worksheets can be read by the selected teacher and administrator. Unsubmitted drafts are private. You can participate without a name; no phone number, address, or date of birth is collected.",
          )}
        </p>
        <h2>
          {t("같은 기기에서 이어서 학습하기", "Returning on the same device")}
        </h2>
        <p>
          {t(
            "게스트 학습은 무작위 개인 ID와 보안 쿠키로 연결합니다. 닉네임이나 IP 주소만으로 다른 사람의 기록을 불러오지 않습니다. 내 글·학습 기록의 조회와 관리는 로그인과 관리자 승인이 필요합니다. 쿠키를 지우기 전에 같은 브라우저에서 기록 관리 계정을 신청하면 기존 기록을 연결할 수 있습니다. 별도의 복구 코드는 제공하지 않습니다.",
            "Guest learning uses a random private ID and secure cookie. Nicknames or IP addresses never retrieve another person’s records. Viewing and managing saved writing requires sign-in and administrator approval. Request an account in the same browser before clearing cookies to retain your records. There is no separate recovery code.",
          )}
        </p>
        <h2>{t("AI 학습 보조자료", "AI learning aids")}</h2>
        <p>
          {t(
            "AI 요약은 동의한 경우에만 개인 묵상을 OpenAI에 전송합니다. EN 모드의 참여자 글 번역도 OpenAI를 사용할 수 있습니다. AI 결과는 공식 교리 자료를 대신하지 않습니다.",
            "AI summaries send private reflections to OpenAI only with your agreement. Translation of participant content in EN mode can also use OpenAI. AI results do not replace official doctrinal sources.",
          )}
        </p>
      </section>
      {boot?.actor.kind === "guest" && (
        <section className="panel">
          <h2>{t("내 기록 삭제", "Delete my records")}</h2>
          <p>
            {t(
              "묵상, 공유 글, 활동지, 제출물과 피드백이 삭제됩니다. 삭제한 기록은 되돌릴 수 없습니다.",
              "This deletes reflections, shared posts, worksheets, submissions, and feedback. Deleted records cannot be recovered.",
            )}
          </p>
          <Confirm
            title={t(
              "나의 기록을 모두 삭제할까요?",
              "Delete all of your records?",
            )}
            description={t(
              "이 작업은 되돌릴 수 없습니다.",
              "This cannot be undone.",
            )}
            trigger={
              <button className="button danger">
                {t("내 기록 모두 삭제", "Delete all my records")}
              </button>
            }
            onConfirm={() =>
              api("delete-records", { confirm: "DELETE" })
                .then(() => {
                  for (const key of Object.keys(localStorage))
                    if (
                      key.startsWith("ggc_draft:") ||
                      key.startsWith("ggc_insight:")
                    )
                      localStorage.removeItem(key);
                  return reload();
                })
                .then(() =>
                  notify(
                    t("기록을 삭제했습니다.", "Your records were deleted."),
                  ),
                )
                .catch(error)
            }
          />
        </section>
      )}
    </div>
  );
}
