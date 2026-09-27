"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useApp } from "./provider";
export function PasswordGuidance() {
  const { t } = useApp();
  return (
    <small className="password-guidance">
      {t(
        "10~128자로 입력하세요. 영문·숫자·기호를 섞고 다른 사이트와 다른 비밀번호를 권장합니다. 비밀번호는 다른 사람에게 알려 주지 마세요.",
        "Use 10–128 characters. A mix of letters, numbers and symbols and a unique password is recommended. Keep it private.",
      )}
    </small>
  );
}
export function ResetEmailForm() {
  const { t, error } = useApp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <details className="reset-email">
      <summary>{t("비밀번호를 잊으셨나요?", "Forgot your password?")}</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setSent(false);
          try {
            await api("auth/reset-email", { email });
            setSent(true);
          } catch (e) {
            error(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          {t("재설정 메일을 받을 이메일", "Email for password reset")}
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="button secondary" disabled={busy}>
          {busy
            ? t("보내는 중…", "Sending…")
            : t("비밀번호 재설정 메일 보내기", "Send password reset email")}
        </button>
        {sent && (
          <p className="notice" role="status">
            {t(
              "등록된 이메일이면 재설정 메일이 발송됩니다. 받은편지함과 스팸함을 확인해 주세요.",
              "If this email is registered, a reset message will be sent. Check your inbox and spam folder.",
            )}
          </p>
        )}
      </form>
    </details>
  );
}
export function PasswordResetPage() {
  const { t, error, boot, reload } = useApp();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "failed" | "done">(
    "loading",
  );
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const access_token = fragment.get("access_token"),
      refresh_token = fragment.get("refresh_token");
    const invalid = fragment.has("error") || fragment.has("error_code");
    window.history.replaceState(null, "", window.location.pathname);
    if (invalid) {
      setState("failed");
      return;
    }
    if (access_token && refresh_token) {
      api("auth/recovery-session", { access_token, refresh_token })
        .then(() => setState("ready"))
        .catch((e) => {
          error(e);
          setState("failed");
        });
    } else setState("ready");
  }, [error]);
  return (
    <div className="page narrow">
      <section className="panel">
        <h1>{t("비밀번호 재설정", "Reset your password")}</h1>
        {state === "loading" ? (
          <p role="status">
            {t("재설정 링크를 확인하고 있습니다…", "Checking your reset link…")}
          </p>
        ) : state === "done" ? (
          <>
            <p role="status">
              {t(
                "비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.",
                "Password changed. Sign in with your new password.",
              )}
            </p>
            <Link className="button primary" href="/account">
              {t("로그인으로 이동", "Go to sign in")}
            </Link>
          </>
        ) : state === "failed" ? (
          <p className="notice">
            {t(
              "링크가 만료되었거나 유효하지 않습니다. 아래에서 새 메일을 요청하세요.",
              "This link is expired or invalid. Request a new email below.",
            )}
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("auth/change-password", { password });
                setPassword("");
                setState("done");
                await reload();
              } catch (e) {
                error(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              {t(
                "재설정 메일의 링크로 접속했거나 현재 로그인된 계정의 비밀번호를 변경합니다.",
                "Change the password for the account verified by your reset link or current sign-in.",
              )}
            </p>
            <label className="field">
              {t("새 비밀번호", "New password")}
              <input
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <PasswordGuidance />
            <button
              className="button primary"
              disabled={busy || password.length < 10}
            >
              {t("새 비밀번호 저장", "Save new password")}
            </button>
          </form>
        )}
        {state !== "done" && <ResetEmailForm />}
      </section>
    </div>
  );
}
