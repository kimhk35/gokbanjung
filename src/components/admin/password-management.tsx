"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "../provider";
import { PasswordGuidance } from "../password-reset";
import { Confirm } from "../ui/dialog";
import { displayLoginId } from "@/lib/login-id";
type Account = { id: string; nickname: string; email: string; role: string };
export function PasswordManagement() {
  const { t, error, notify } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Account[]>("admin/accounts").then(setAccounts).catch(error);
  }, [error]);
  const reset = async () => {
    setBusy(true);
    try {
      await api("admin/reset-password", {
        actor_id: selected,
        mode: "temporary",
        password,
      });
      setPassword("");
      notify(
        t(
          "비밀번호를 초기화했습니다. 새 비밀번호를 해당 사용자에게 별도로 전달해 주세요.",
          "Password reset. Give the new password directly to this user.",
        ),
      );
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <h2>{t("계정 비밀번호 관리", "Account password management")}</h2>
      <p>
        {t(
          "관리자는 새 비밀번호로 직접 초기화할 수 있습니다. 계정의 승인 상태와 기록은 유지됩니다.",
          "Administrators can directly set a new password. Approval status and records are preserved.",
        )}
      </p>
      <label className="field">
        {t("계정 선택", "Select account")}
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setPassword("");
          }}
          disabled={busy}
        >
          <option value="">{t("사용자를 선택하세요", "Choose a user")}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname}
              {a.email ? ` · ${displayLoginId(a.email)}` : ""} · {a.role}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t("초기화할 새 비밀번호", "New password to set")}
        <input
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <PasswordGuidance />
      <Confirm
        trigger={
          <button
            className="button secondary"
            disabled={!selected || password.length < 10 || busy}
          >
            {t("비밀번호 초기화", "Reset password")}
          </button>
        }
        title={t(
          "이 계정의 비밀번호를 초기화할까요?",
          "Reset this account’s password?",
        )}
        description={t("{v} 님의 기존 비밀번호를 더 이상 사용할 수 없게 됩니다.", "The user’s old password will no longer work.", { v: accounts.find((a) => a.id === selected)?.nickname || "" })}
        onConfirm={() => reset()}
      />
    </section>
  );
}
