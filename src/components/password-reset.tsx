"use client";
import { useState } from "react";
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
// ID accounts have no mailbox, so a forgotten password is reset by a course administrator.
export function ForgotPasswordNote() {
  const { t } = useApp();
  return (
    <details className="reset-email">
      <summary>{t("비밀번호를 잊으셨나요?", "Forgot your password?")}</summary>
      <p>
        {t(
          "아이디 계정에는 이메일이 없어 메일로 재설정할 수 없습니다. 같은 과정 관리자에게 임시 비밀번호를 요청한 뒤, 로그인하고 이 화면에서 새 비밀번호로 바꿔 주세요.",
          "ID accounts have no email, so passwords cannot be reset by mail. Ask your course administrator for a temporary password, sign in, and change it here.",
        )}
      </p>
    </details>
  );
}
export function PasswordResetPage() {
  const { t, error, boot, reload } = useApp();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const signedIn = boot?.actor.kind === "user";
  return (
    <div className="page narrow">
      <section className="panel">
        <h1>{t("비밀번호 변경", "Change your password")}</h1>
        {done ? (
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
        ) : !boot ? (
          <p role="status">{t("확인하고 있습니다…", "Checking…")}</p>
        ) : !signedIn ? (
          <>
            <p className="notice">
              {t(
                "비밀번호 변경은 로그인한 뒤에 할 수 있습니다.",
                "Sign in before changing your password.",
              )}
            </p>
            <Link className="button primary" href="/account">
              {t("로그인으로 이동", "Go to sign in")}
            </Link>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("auth/change-password", { password });
                setPassword("");
                setDone(true);
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
                "현재 로그인된 계정의 비밀번호를 변경합니다. 변경하면 모든 기기에서 로그아웃됩니다.",
                "Change the password for the signed-in account. You will be signed out on every device.",
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
        {!done && !signedIn && <ForgotPasswordNote />}
      </section>
    </div>
  );
}
