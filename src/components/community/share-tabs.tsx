"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "../provider";
export function ShareTabs() {
  const { t } = useApp();
  const path = usePathname();
  const tabs = [
    ["/think", t("함께 생각하기", "Think together")],
    ["/community", t("생각벽", "Thought wall")],
    ["/discussion", t("토론", "Discussion")],
  ];
  return (
    <nav className="share-tabs" aria-label={t("나눔 메뉴", "Sharing sections")}>
      {tabs.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={path.startsWith(href) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
