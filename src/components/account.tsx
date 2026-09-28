"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useApp } from "./provider";
import { api } from "@/lib/client";
import { canManageRecords } from "@/lib/access";
import { PasswordGuidance } from "./password-reset";
import { LoginForm } from "./teacher/teacher";
import { NicknameEditor } from "./nickname-editor";
import { loginStatus } from "@/lib/login-status";

export function GuestGate({ children }: { children: ReactNode }) {
  const { boot, ready, t, reload, error } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ready)
    return (
      <div className="page narrow" role="status">
        {t(
          "학습 공간을 연결하고 있습니다…",
          "Connecting to your learning space…",
        )}
      </div>
    );
  if (!boot)
    return (
      <div className="page narrow">
        <p>
          {t(
            "연결하지 못했습니다. 다시 시도해 주세요.",
            "Unable to connect. Please retry.",
          )}
        </p>
        <button
          className="button primary"
          onClick={() => reload().catch(error)}
        >
          {t("다시 연결", "Reconnect")}
        </button>
      </div>
    );
  if (boot.actor.nickname.trim().length >= 2) return children;
  return (
    <div className="page narrow">
      <section className="panel">
        <span className="overline">{t("환영합니다", "WELCOME")}</span>
        <h1>{t("어떤 이름으로 함께할까요?", "What shall we call you?")}</h1>
        <p>
          {t(
            "닉네임만 정하면 게스트로 바로 학습할 수 있습니다. 회원가입은 필요하지 않습니다.",
            "Choose a nickname to learn as a guest. No registration is needed.",
          )}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("profile", { nickname: name.trim() });
              await reload();
            } catch (e) {
              error(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            {t("닉네임", "Nickname")}
            <input
              autoComplete="nickname"
              minLength={2}
              maxLength={40}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            className="button primary"
            disabled={busy || name.trim().length < 2}
          >
            {t("게스트로 학습 시작", "Start as a guest")}
          </button>
        </form>
        <p className="notice">
          {t(
            "닉네임이 같아도 기록은 따로 보관됩니다. 저장 기록의 조회·관리는 로그인 및 관리자 승인이 필요합니다.",
            "Even matching nicknames have separate records. Viewing and managing saved records requires sign-in and administrator approval.",
          )}
        </p>
        <Link href="/account">
          {t("기록 관리 로그인", "Sign in for records")}
        </Link>
      </section>
    </div>
  );
}
export function RecordsGate({ children }: { children: ReactNode }) {
  const { boot, t } = useApp();
  if (!canManageRecords(boot?.actor))
    return (
      <div className="page narrow">
        <h1>
          {t(
            "기록 관리에는 로그인이 필요합니다",
            "Sign in to manage your records",
          )}
        </h1>
        <p>
          {t(
            "관리자가 승인한 계정으로만 내 글과 학습 기록을 조회·관리할 수 있습니다. 게스트 학습은 계속 이용할 수 있습니다.",
            "Only administrator-approved accounts can view and manage saved writing and learning records. Guest learning remains available.",
          )}
        </p>
        <Link className="button primary" href="/account">
          {t("로그인 · 승인 신청", "Sign in · Request approval")}
        </Link>
      </div>
    );
  return children;
}
export function AccountPage() {
  const { t, uiLang, boot, error, reload, notify } = useApp();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  return (
    <div className="page narrow">
      <h1>{t("내 계정 · 로그인", "My account · Sign in")}</h1>
      {boot && (
        <p className="notice">
          {t("로그인 상태: ", "Signed in as: ")}
          {loginStatus(boot.actor, uiLang)}
        </p>
      )}
      {canManageRecords(boot?.actor) && boot && (
        <Link className="button secondary" href="/privacy">
          {t("담당 교사 선택 · 수정", "Choose or change my teacher")}
        </Link>
      )}
      {canManageRecords(boot?.actor) && boot && (
        <NicknameEditor
          key={`${boot.actor.id}:${boot.actor.nickname}`}
          initialName={boot.actor.nickname}
        />
      )}
      <p>
        {t(
          "일반 학습에는 가입이 필요 없습니다. 기록을 관리하려면 아이디와 비밀번호로 신청하고 관리자 승인을 기다려 주세요. 같은 브라우저에서 신청하면 게스트 기록이 그대로 연결됩니다.",
          "No account is needed for learning. To manage records, request an ID and await administrator approval. Apply in the same browser to retain your guest records.",
        )}
      </p>
      {boot?.actor.account_status && (
        <p className="notice" role="status">
          {t("신청 상태: ", "Request status: ")}
          {t(
            {
              pending: "승인 대기",
              approved: "승인 완료",
              rejected: "거절",
              suspended: "정지",
            }[boot.actor.account_status],
            boot.actor.account_status,
          )}
        </p>
      )}
      {canManageRecords(boot?.actor) ? (
        <Link className="button primary" href="/my-posts">
          {t("내가 쓴 글 보기", "View my writing")}
        </Link>
      ) : (
        <LoginForm />
      )}
      {!canManageRecords(boot?.actor) &&
        !boot?.actor.account_status &&
        !sent && (
          <section className="panel">
            <h2>
              {t("기록 관리 계정 신청", "Request a record-management account")}
            </h2>
            <p>
              {t(
                "기록관리 계정은 내가 작성한 글과 개인 학습 기록을 로그인하여 조회·관리할 때 사용합니다. 같은 브라우저에서 신청하면 기존 게스트 기록이 연결됩니다. 교사 계정은 별도의 기록관리 계정 신청 없이 이 기능을 사용할 수 있습니다.",
                "Use a record-management account to sign in and view or manage your writing and personal learning records. Applying in the same browser links your existing guest records. Teacher accounts include these features without a separate application.",
              )}
            </p>
            <form
              id="account-application"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await api("account/request", { username: email, password });
                  setSent(true);
                  setPassword("");
                  notify(
                    t(
                      "신청이 접수되었습니다. 관리자 승인을 기다려 주세요.",
                      "Application received. Please wait for administrator approval.",
                    ),
                  );
                  await reload();
                } catch (e) {
                  error(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                {t(
                  "아이디 (영문·숫자·밑줄 4~24자)",
                  "User ID (4–24 letters, numbers or underscores)",
                )}
                <input
                  type="text"
                  minLength={4}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]+"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field">
                {t("비밀번호 (10자 이상)", "Password (10+ characters)")}
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <PasswordGuidance />
              <button className="button primary" disabled={busy}>
                {t("관리자에게 승인 신청", "Request administrator approval")}
              </button>
            </form>
          </section>
        )}
      {sent && (
        <p className="notice">
          {t(
            "신청이 접수되었습니다. 관리자 승인 후 로그인하세요.",
            "Application received. Sign in after administrator approval.",
          )}
        </p>
      )}
      <p>
        {t(
          "비밀번호 초기화는 관리자에게 요청해 주세요.",
          "Ask the administrator to reset your password.",
        )}
      </p>
      {(boot?.actor.kind === "user" || boot?.actor.account_status) && (
        <button
          className="button secondary"
          onClick={() => api("auth/logout", {}).then(reload).catch(error)}
        >
          {t("로그아웃", "Sign out")}
        </button>
      )}
    </div>
  );
}
