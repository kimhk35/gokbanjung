"use client";
import { useApp } from "../provider";
import { PageTitle } from "../learning/learn";
import { GUIDE, GUIDE_PARTS, type GuideSection } from "@/data/guide";

const PARTS = Object.keys(GUIDE_PARTS) as GuideSection["part"][];
export function GuidePage() {
  const { t, lang, setLang } = useApp();
  return (
    <div className="page narrow guide-page">
      <div className="guide-top">
        <PageTitle
          eyebrow="GUIDE"
          title={t("사용설명서", "User guide")}
          description={t(
            "처음에는 기기 언어에 맞춰 자동으로 보여 드려요. 버튼으로 언제든 바꿀 수 있어요.",
            "Shown in your device language at first. Switch any time with the buttons.",
          )}
        />
        <div
          className="guide-lang"
          role="group"
          aria-label={t("언어", "Language")}
        >
          <button
            type="button"
            aria-pressed={lang === "ko"}
            onClick={() => setLang("ko")}
          >
            한국어
          </button>
          <button
            type="button"
            aria-pressed={lang === "en"}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
      </div>
      <nav className="guide-toc" aria-label={t("목차", "Contents")}>
        {PARTS.map((p) => (
          <div key={p}>
            <strong>{GUIDE_PARTS[p][lang]}</strong>
            <ul>
              {GUIDE.filter((s) => s.part === p).map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title[lang]}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {PARTS.map((p) => (
        <div key={p}>
          <h2 className="guide-part">{GUIDE_PARTS[p][lang]}</h2>
          {GUIDE.filter((s) => s.part === p).map((s) => (
            <section key={s.id} id={s.id} className="guide-section">
              <h3>{s.title[lang]}</h3>
              {s.intro && <p>{s.intro[lang]}</p>}
              {s.steps && (
                <ol>
                  {s.steps.map((x, i) => (
                    <li key={i}>{x[lang]}</li>
                  ))}
                </ol>
              )}
              {s.table && (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {s.table.head.map((h, i) => (
                          <th key={i}>{h[lang]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r, i) => (
                        <tr key={i}>
                          {r.map((c, j) => (
                            <td key={j}>{c[lang]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.note && <p className="guide-note">{s.note[lang]}</p>}
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
