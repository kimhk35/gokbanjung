"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "./provider";

export function NicknameEditor({ initialName }: { initialName: string }) {
  const { t, reload, notify, error } = useApp();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel" id="nickname">
      <h2>{t("내 닉네임 설정 · 수정", "Set or edit my nickname")}</h2>
      <p>
        {t(
          "로그인 상태와 새로 작성하는 글에 표시할 이름을 정해 주세요. 언제든 수정할 수 있습니다.",
          "Choose the name shown in your sign-in status and new posts. You can change it at any time.",
        )}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await api("profile", { nickname: name.trim() });
            await reload();
            notify(t("닉네임을 저장했습니다.", "Your nickname was saved."));
          } catch (cause) {
            error(cause);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          {t("닉네임 (2~40자)", "Nickname (2–40 characters)")}
          <input
            autoComplete="nickname"
            required
            minLength={2}
            maxLength={40}
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          className="button primary"
          disabled={busy || name.trim().length < 2}
        >
          {busy ? t("저장 중…", "Saving…") : t("닉네임 저장", "Save nickname")}
        </button>
      </form>
    </section>
  );
}
