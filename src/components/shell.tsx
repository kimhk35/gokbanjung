"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  MessageCircle,
  NotebookPen,
  Compass,
  Sun,
  Moon,
  Menu,
  ArrowUpRight,
  ShieldCheck,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "./provider";
import { Modal } from "./ui/dialog";
import { GuestGate } from "./account";
import { AnnouncementPopup } from "./announcement-popup";
import { loginStatus } from "@/lib/login-status";
import { canManageRecords } from "@/lib/access";
export function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, t, boot } = useApp();
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [textSize, setTextSize] = useState("large");
  useEffect(() => {
    const value = localStorage.getItem("ggc_theme") === "dark";
    setDark(value);
    document.documentElement.dataset.theme = value ? "dark" : "light";
    const saved = localStorage.getItem("ggc_text_size");
    const size = saved === "small" || saved === "extra" ? saved : "large";
    setTextSize(size);
    document.documentElement.dataset.textSize = size;
  }, []);
  const theme = () => {
    setDark(!dark);
    document.documentElement.dataset.theme = !dark ? "dark" : "light";
    localStorage.setItem("ggc_theme", !dark ? "dark" : "light");
  };
  const status = loginStatus(boot?.actor, lang);
  const links = [
    ["/", t("홈", "Home"), Home],
    ["/learn", t("말씀 학습", "Study the word"), BookOpen],
    ["/think", t("나눔", "Sharing"), MessageCircle],
    ["/ward", t("와드 일정", "Ward calendar"), CalendarDays],
    ["/journey", t("나의 여정", "My journey"), Compass],
  ] as const;
  const groups: Record<string, string[]> = {
    "/think": ["/think", "/p/", "/community", "/discussion"],
    "/ward": ["/ward", "/e/"],
  };
  const isActive = (href: string) =>
    href === "/"
      ? path === "/"
      : (groups[href] || [href]).some((p) => path.startsWith(p));
  return (
    <>
      <a className="skip" href="#main">
        {t("본문으로 건너뛰기", "Skip to content")}
      </a>
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          <span className="brand-copy">
            <small className="brand-stake">
              {t("경기스테이크", "GYEONGGI STAKE")}
            </small>
            <strong>{t("곡반정와드", "GOKBANJEONG WARD")}</strong>
            <small>
              {t(
                "복음교리반 · 함께 읽고, 함께 자라다",
                "GOSPEL DOCTRINE · GROW TOGETHER",
              )}
            </small>
          </span>
        </Link>
        <nav
          className="desktop-nav"
          aria-label={t("주 메뉴", "Main navigation")}
        >
          {links.slice(1).map(([href, label, Icon], index) => (
            <Link
              aria-current={isActive(href) ? "page" : undefined}
              href={href}
              key={href}
            >
              <span className="nav-symbol">
                <Icon size={23} strokeWidth={1.7} />
              </span>
              <span className="nav-copy">
                <strong>{label}</strong>
                <small>
                  {
                    [
                      t("경전 속에서 발견하는 오늘", "Discover the word"),
                      t(
                        "함께 생각하기 · 생각벽 · 토론",
                        "Think together · wall · discussion",
                      ),
                      t(
                        "와드 모임과 활동 한눈에",
                        "Ward meetings and activities",
                      ),
                      t("말씀과 함께 쌓아가는 기록", "Keep your reflections"),
                    ][index]
                  }
                </small>
              </span>
              <ArrowUpRight className="nav-arrow" size={17} />
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <div className="languages" aria-label={t("언어 선택", "Language")}>
            <button aria-pressed={lang === "ko"} onClick={() => setLang("ko")}>
              한국어
            </button>
            <span>/</span>
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              EN
            </button>
          </div>
          <button
            className="icon-button"
            onClick={theme}
            aria-label={t("화면 밝기 전환", "Switch color theme")}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            className="icon-button"
            onClick={() => setMenu(true)}
            aria-label={t("더보기", "More")}
          >
            <Menu size={21} />
          </button>
        </div>
      </header>
      <div className="reading-toolbar">
        {(boot?.actor.role === "ADMIN" || boot?.actor.role === "TEACHER") && (
          <Link href="/lesson-builder">{t("수업 구성", "Lesson builder")}</Link>
        )}
        {(boot?.actor.role === "ADMIN" || boot?.actor.role === "TEACHER") && (
          <Link href="/teacher/materials">
            {t("공과자료실", "Lesson library")}
          </Link>
        )}
        <Link href="/scriptures">{t("경전 읽기 ↗", "Read scriptures ↗")}</Link>
        <Link href="/quiz">{t("경전 퀴즈", "Scripture quiz")}</Link>
        <Link href="/my-posts">{t("내가 쓴 글", "My writing")}</Link>
        <Link href="/account">
          {t("로그인 상태: ", "Signed in as: ")}
          {status}
        </Link>
        {canManageRecords(boot?.actor) && (
          <Link href="/account#nickname">
            {t("닉네임 수정", "Edit nickname")}
          </Link>
        )}
        <label>
          {t("글자 크기", "Text size")}
          <select
            aria-label={t("글자 크기", "Text size")}
            value={textSize}
            onChange={(e) => {
              const size = e.target.value;
              setTextSize(size);
              document.documentElement.dataset.textSize = size;
              try {
                localStorage.setItem("ggc_text_size", size);
              } catch {
                /* Still apply for this visit. */
              }
            }}
          >
            <option value="small">{t("더 작게", "Smaller")}</option>
            <option value="large">{t("크게", "Large")}</option>
            <option value="extra">{t("아주 크게", "Extra large")}</option>
          </select>
        </label>
      </div>
      <main id="main">
        {[
          "/account",
          "/admin",
          "/teacher",
          "/privacy",
          "/auth",
          // Public comefollowme-style pages: readable (and repliable as
          // "익명") without choosing a nickname first.
          "/ward",
          "/e/",
          "/think",
          "/p/",
          "/guide",
        ].some((p) => path.startsWith(p)) ? (
          children
        ) : (
          <GuestGate
            key={`${boot?.actor.id}:${boot?.actor.role}:${boot?.actor.account_status}`}
          >
            {children}
          </GuestGate>
        )}
      </main>
      <AnnouncementPopup />
      <footer>
        <span>
          {t("곡반정와드 복음교리반", "Gokbanjeong Ward Gospel Doctrine")}
        </span>
        <p>
          {t(
            "예수 그리스도의 복음 안에서 말씀을 읽고, 생각하고, 나누고, 실천합니다.",
            "Read, ponder, share, and live the gospel of Jesus Christ together.",
          )}
        </p>
        <Link href="/privacy">
          {t("개인정보와 나의 기록", "Privacy & my records")}
        </Link>
        <span className="disclaimer">
          {t(
            "본 사이트는 와드의 학습 보조 공간이며 교회의 공식 웹사이트가 아닙니다.",
            "This ward learning space is not an official Church website.",
          )}
        </span>
        <span className="creator">
          {t("제작자 · 김홍겸 형제", "Created by Brother Honggyeom Kim")}
        </span>
        <p className="copyright-notice">
          {t(
            "본 사이트의 모든 자료에 대한 저작권은 예수 그리스도 후기성도 교회에 있습니다. 저작권자의 허락 없는 무단 복제·배포 및 2차적 저작물 제작을 금합니다.",
            "Copyright in all materials on this site belongs to The Church of Jesus Christ of Latter-day Saints. Reproduction, distribution, and the creation of derivative works without the copyright holder’s permission are prohibited.",
          )}
        </p>
      </footer>
      <nav
        className="mobile-nav"
        aria-label={t("하단 메뉴", "Mobile navigation")}
      >
        {links.map(([href, label, Icon]) => (
          <Link
            href={href}
            key={href}
            aria-current={isActive(href) ? "page" : undefined}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <Modal
        title={t("학습 공간", "Learning space")}
        open={menu}
        onOpenChange={setMenu}
      >
        <div className="menu-list">
          {[
            ["/scriptures", t("경전 읽기", "Read scriptures"), BookOpen],
            ["/rewards", t("나의 리워드", "My rewards"), Compass],
            ["/worksheet", t("주간 활동지", "Weekly worksheet"), NotebookPen],
            ["/questions", t("궁금해요", "Question box"), MessageCircle],
            ["/insight", t("오늘의 Insight", "Today’s insight"), Sun],
            ["/calendar", t("학습 달력", "Learning calendar"), Compass],
            [
              "/lesson-builder",
              t("수업 구성", "Lesson builder"),
              GraduationCap,
            ],
            [
              "/teacher",
              t("교사 학습관리", "Teacher workspace"),
              GraduationCap,
            ],
            ["/teacher/apply", t("교사 신청", "Apply to teach"), BookOpen],
            ["/admin", t("관리자", "Administrator"), ShieldCheck],
            ["/privacy", t("내 기록 관리", "Manage my records"), ShieldCheck],
          ].map(([href, label, Icon]) => {
            const I = Icon as typeof BookOpen;
            return (
              <Link
                href={String(href)}
                key={String(href)}
                onClick={() => setMenu(false)}
              >
                <I size={20} />
                {String(label)}
                <ArrowUpRight size={17} />
              </Link>
            );
          })}
        </div>
        {boot && (
          <p className="muted">
            {t("로그인 상태: ", "Signed in as: ")}
            {status}
          </p>
        )}
      </Modal>
    </>
  );
}
