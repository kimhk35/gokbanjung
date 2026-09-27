"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sprout, Bookmark, Flower2, Download, Check } from "lucide-react";
import { useApp } from "../provider";
import { PageTitle, Empty } from "./learn";
import { api } from "@/lib/client";
import {quizPoints} from '@/lib/quiz';
type Event = {
  id: string;
  kind: "daily" | "weekly" | "monthly21" | "quiz_daily" | "quiz_weekly" | "quiz_monthly";
  period: string;
  earned_at: string;
};
export function RewardsPage() {
  const { t, lang, boot, error } = useApp();
  const [data, setData] = useState<{ events: Event[]; month: string } | null>(
    null,
  );
  useEffect(() => {
    if (boot) api<typeof data>("rewards").then(setData).catch(error);
  }, [boot]);
  const month = data?.month || "";
  const days =
    data?.events.filter((e) => e.kind === "daily" && e.period.startsWith(month))
      .length || 0;
  const monthly = data?.events.find(
    (e) => e.kind === "monthly21" && e.period === month,
  );
  const weekly = data?.events.filter((e) => e.kind === "weekly") || [];
  const download = async (e: Event) => {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#20364a";
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.strokeStyle = "#ba9d68";
    ctx.lineWidth = 2;
    ctx.strokeRect(65, 65, 950, 1220);
    ctx.fillStyle = "#ddc69d";
    ctx.textAlign = "center";
    ctx.font = '28px "Noto Sans KR"';
    ctx.fillText(
      t("나의 배움에 주는 작은 선물", "A SMALL GIFT FOR YOUR LEARNING"),
      540,
      200,
    );
    ctx.font = '130px "Noto Sans KR"';
    ctx.fillText("21", 540, 440);
    ctx.fillStyle = "#ffffff";
    ctx.font = '52px "Noto Sans KR"';
    ctx.fillText(t("꾸준한 배움", "STEADY LEARNING"), 540, 590);
    ctx.font = '32px "Noto Sans KR"';
    ctx.fillText(e.period, 540, 700);
    ctx.font = '28px "Noto Sans KR"';
    ctx.fillText(
      t(
        "서로 다른 21일, 말씀과 함께했습니다.",
        "You spent 21 different days in the word.",
      ),
      540,
      850,
    );
    ctx.fillText(
      t(
        "작은 날들이 모여 나의 이야기가 됩니다.",
        "Small days become your story.",
      ),
      540,
      910,
    );
    ctx.fillStyle = "#ddc69d";
    ctx.font = '24px "Noto Sans KR"';
    ctx.fillText(
      t("곡반정와드 복음교리반", "Gokbanjeong Ward Gospel Doctrine"),
      540,
      1150,
    );
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `steady-learning-${e.period}-${lang}.png`;
    a.click();
  };
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow={t("나의 작은 리워드", "MY LEARNING REWARDS")}
        title={t(
          "작은 날들이 모여, 배움이 자랍니다",
          "Small days grow into learning",
        )}
        description={t(
          "다른 사람과 비교하지 않고, 내가 이어온 시간을 기념합니다.",
          "Celebrate your own journey, without comparing it with anyone else.",
        )}
      />
      <section className="reward-month">
        <h2>{t('경전 퀴즈 추가 보상','Scripture quiz bonus rewards')}</h2>
        <p>{t('모은 학습 포인트: ','Learning points earned: ')}{data?.events.reduce((sum,e)=>sum+(e.kind.startsWith('quiz_')?quizPoints[e.kind.replace('quiz_','') as keyof typeof quizPoints]:0),0)||0}</p>
        <div className="chips">{data?.events.filter(e=>e.kind.startsWith('quiz_')).map(e=><span className="badge" key={e.id}>{e.period} · {t(e.kind==='quiz_daily'?'오늘의 경전 탐구자':e.kind==='quiz_weekly'?'주간 경전 탐구자':'월간 경전 탐구자',e.kind.replace('quiz_','')+' scripture explorer')}</span>)}</div>
        <Link className="button secondary" href="/quiz">{t('퀴즈에 도전하기','Try a quiz')}</Link>
      </section>
      <section className="reward-month">
        <div className="section-heading">
          <div>
            <span className="overline">{month || "2026"}</span>
            <h2>{t("21일의 배움 정원", "Your 21-day learning garden")}</h2>
          </div>
          <Flower2 size={36} strokeWidth={1.3} />
        </div>
        <p>
          {monthly
            ? t(
                "이번 달의 꾸준한 배움 배지를 받았어요!",
                "You earned this month’s Steady Learning badge!",
              )
            : t(
                `이번 달 ${days}일 함께했어요. ${Math.max(0, 21 - days)}일을 더 만나면 배지가 완성됩니다.`,
                `You learned on ${days} days this month. ${Math.max(0, 21 - days)} more days to your badge.`,
              )}
        </p>
        <div
          className="reward-garden"
          aria-label={t(
            `21일 중 ${Math.min(days, 21)}일 완료`,
            `${Math.min(days, 21)} of 21 days completed`,
          )}
        >
          {Array.from({ length: 21 }, (_, i) => (
            <div className={i < days ? "earned" : ""} key={i}>
              {i < days ? <Sprout size={27} /> : <span>{i + 1}</span>}
            </div>
          ))}
        </div>
        {monthly && (
          <button className="button primary" onClick={() => download(monthly)}>
            <Download size={18} />
            {t("기념 카드 저장", "Save celebration card")}
          </button>
        )}
      </section>
      <div className="reward-rules">
        {[
          {
            icon: Sprout,
            title: t("오늘의 새싹", "Today’s sprout"),
            body: t(
              "마음에 남은 것과 오늘의 실천을 적고 학습을 마치면 하루에 하나씩 받습니다.",
              "Write a reflection and a practice, then complete a lesson to earn one sprout per day.",
            ),
          },
          {
            icon: Bookmark,
            title: t("한 주의 책갈피", "A week’s bookmark"),
            body: t(
              "해당 주의 7일 학습을 모두 완료하면 받습니다. 같은 주차는 한 번만 지급됩니다.",
              "Complete all seven daily lessons in a week. Each week earns one bookmark.",
            ),
          },
          {
            icon: Flower2,
            title: t("꾸준한 배움", "Steady learning"),
            body: t(
              "한국 시간 기준으로 한 달에 서로 다른 21일 이상 학습하면 받습니다.",
              "Learn on at least 21 different days in a calendar month, using Korean time.",
            ),
          },
        ].map((r) => (
          <article key={r.title}>
            <r.icon size={28} strokeWidth={1.4} />
            <h3>{r.title}</h3>
            <p>{r.body}</p>
          </article>
        ))}
      </div>
      <p className="notice">
        {t(
          "하루에 여러 공과를 마쳐도 월간 출석은 1일입니다. 지난 학습을 몰아서 완료해도 과거 날짜로 소급하지 않습니다. 놓친 날이 있어도 이미 받은 리워드는 사라지지 않습니다. 리워드는 신앙 수준을 평가하지 않으며 현금이나 상품으로 교환되지 않습니다.",
          "Completing several lessons in one day counts as one attendance day. Catch-up learning does not backdate attendance. Missing a day does not remove earned rewards. Rewards do not assess faith and cannot be exchanged for money or goods.",
        )}
      </p>
      <h2>{t("나의 책갈피 모음", "My weekly bookmarks")}</h2>
      {weekly.length ? (
        <div className="chips">
          {weekly.map((e) => (
            <Link key={e.id} href={`/week/${e.period}`}>
              <Bookmark size={17} /> {t(`${e.period}주차`, `Week ${e.period}`)}
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title={t(
            "한 주의 배움을 마치면 책갈피가 생깁니다.",
            "Complete a week to earn your first bookmark.",
          )}
        />
      )}
      <h2>{t("지금까지의 월간 배지", "Monthly badges")}</h2>
      <div className="chips">
        {data?.events
          .filter((e) => e.kind === "monthly21")
          .map((e) => (
            <button
              className="button secondary"
              key={e.id}
              onClick={() => download(e)}
            >
              <Check size={17} />
              {e.period} · {t("꾸준한 배움", "Steady learning")}
            </button>
          ))}
      </div>
    </div>
  );
}
