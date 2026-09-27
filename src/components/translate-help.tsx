"use client";
import { useState } from "react";
import { Globe } from "lucide-react";
import { useApp } from "./provider";
import { Modal } from "./ui/dialog";
import { GUIDE } from "@/data/guide";

const SECTION = GUIDE.find((s) => s.id === "other-languages")!;

// "🌐 다른 언어" button: explains how to use the browser's own translation.
export function TranslateHelp({
  asMenuItem = false,
}: {
  asMenuItem?: boolean;
}) {
  const { t, tl } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={asMenuItem ? "menu-item-button" : "icon-button"}
        aria-label={t("다른 언어로 보기", "Other languages")}
        onClick={() => setOpen(true)}
      >
        <Globe size={asMenuItem ? 20 : 19} />
        {asMenuItem && t("다른 언어로 보기", "Other languages")}
      </button>
      <Modal title={tl(SECTION.title)} open={open} onOpenChange={setOpen}>
        <div className="translate-help">
          {SECTION.intro && <p>{tl(SECTION.intro)}</p>}
          <ol>
            {SECTION.steps!.map((step, i) => (
              <li key={i}>{tl(step)}</li>
            ))}
          </ol>
          {SECTION.note && <p className="guide-note">{tl(SECTION.note)}</p>}
        </div>
      </Modal>
    </>
  );
}
