"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "../provider";
import { api } from "@/lib/client";
import { PageTitle, Empty } from "../learning/learn";

export function TeacherApply() {
  const { t, boot, error } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(true);
  const signedIn = boot?.actor.kind === "user";
  const actorId = boot?.actor.id;
  useEffect(() => {
    if (!actorId) return;
    let active = true;
    api<{ name: string; email: string; status: string } | null>(
      "teacher/application",
    )
      .then((app) => {
        if (active && app) {
          setEmail(app.email.split("@")[0]);
          setStatus(app.status);
        }
      })
      .catch(error)
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [actorId,error]);
  const allowed = ["ADMIN", "TEACHER"].includes(boot?.actor.role || "");
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow={t("교사 신청", "TEACHER APPLICATION")}
        title={t("함께 배움을 돕는 교사로", "Help others learn")}
        description={t(
          "아이디와 비밀번호로 신청하고 관리자의 승인을 기다려 주세요.",
          "Apply with an ID and password, then wait for administrator approval.",
        )}
      />
      {allowed ? (
        <Link className="button primary" href="/teacher">
          {t("교사 학습관리로 이동", "Open teacher workspace")}
        </Link>
      ) : checking ? (
        <p role="status">{t("신청 상태 확인 중…", "Checking application…")}</p>
      ) : status ? (
        <section className="panel" role="status">
          <Empty
            title={t(
              status === "pending"
                ? "교사 신청이 접수되었습니다."
                : "교사 신청 상태",
              status === "pending"
                ? "Teacher application received."
                : "Teacher application status",
            )}
            body={t(
              status === "pending"
                ? "관리자의 승인을 기다려 주세요. 별도 기록관리 계정 신청은 필요하지 않습니다."
                : status === "rejected"
                  ? "신청이 거절되었습니다. 관리자에게 문의해 주세요."
                  : status === "suspended"
                    ? "교사 권한이 정지되었습니다. 관리자에게 문의해 주세요."
                    : "관리자 승인이 완료되었습니다. 로그인해 주세요.",
              status === "pending"
                ? "Please wait for administrator approval. No separate record-management account is required."
                : status === "approved"
                  ? "Approved. Please sign in."
                  : "Please contact the administrator about your application.",
            )}
          />
          <Link className="button secondary" href="/teacher">
            {t("로그인 화면으로", "Go to sign-in")}
          </Link>
        </section>
      ) : (
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("teacher/request", {
                username: email,
                ...(signedIn ? {} : { password }),
              });
              setPassword("");
              setStatus("pending");
            } catch (e) {
              error(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            {t("아이디", "User ID")}
            <input
              required
              minLength={4}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <p>
            {t(
              "아이디는 영문·숫자·밑줄(_) 4~24자로 입력해 주세요. 대소문자는 구분하지 않습니다.",
              "Use 4–24 letters, numbers or underscores. IDs are case-insensitive.",
            )}
          </p>
          {signedIn ? (
            <p>
              {t(
                "현재 로그인한 계정의 아이디를 입력해 주세요.",
                "Enter your signed-in account ID.",
              )}
            </p>
          ) : (
            <>
              <label className="field">
                {t("비밀번호", "Password")}
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
              <p>
                {t(
                  "비밀번호는 10자 이상으로 입력해 주세요.",
                  "Use a password with at least 10 characters.",
                )}
              </p>
            </>
          )}

          <div className="actions">
            <button
              className="button primary"
              disabled={busy || !boot?.authAvailable}
            >
              {t(
                busy ? "확인 및 신청 중…" : "교사 신청",
                busy ? "Checking and applying…" : "Apply as teacher",
              )}
            </button>
            {!signedIn && (
              <Link className="button secondary" href="/teacher">
                {t("기존 계정 로그인", "Sign in to existing account")}
              </Link>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
