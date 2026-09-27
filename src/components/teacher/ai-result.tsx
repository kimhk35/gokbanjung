"use client";
import { parseAiContent } from "@/lib/ai-content";
import { useApp } from "../provider";

export function AiResult({
  feature,
  content,
}: {
  feature: string;
  content: unknown;
}) {
  const { lang, t } = useApp();
  const data = parseAiContent(feature, content);
  if (!data)
    return (
      <p className="notice" role="status">
        {t(
          "저장된 초안의 형식을 읽지 못했습니다. 위에서 초안을 다시 생성해 주세요.",
          "This saved draft could not be read. Generate a new draft above.",
        )}
      </p>
    );
  return (
    <div className="ai-output">
      {"summary" in data && <p>{data.summary}</p>}
      {"themes" in data && data.themes.length > 0 && (
        <ul className="ai-result-list">
          {data.themes.map((theme, i) => (
            <li key={i}>{theme}</li>
          ))}
        </ul>
      )}
      {"questions" in data && (
        <ol className="ai-result-list">
          {data.questions.map((question, i) => (
            <li key={i}>{question}</li>
          ))}
        </ol>
      )}
      {"items" in data && (
        <ol className="ai-result-list">
          {data.items.map((item, i) => (
            <li key={i}>{item[lang]}</li>
          ))}
        </ol>
      )}
      {"weeks" in data && (
        <ol className="ai-result-list">
          {data.weeks.map((week, i) => (
            <li key={i}>
              <strong>{week.title[lang]}</strong>
              <p>{week.reference[lang]}</p>
              <small>
                {week.start} – {week.end}
              </small>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
