import { LessonPage } from "@/components/learning/learn";
import { StudyReader } from "@/components/learning/study-reader";
import { getStudyDay, dailyStudyHref, isStudyRestDay } from "@/lib/cfm-study-plan";
import { StudyRestDay } from "@/components/learning/study-rest-day";
import { GuestGate } from "@/components/account";
import Link from "next/link";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ number: string; day: string }>;
  searchParams: Promise<{
    view?: string;
    track?: string;
    source?: string;
    anchor?: string;
  }>;
}) {
  const p = await params;
  const query = await searchParams;
  const week = Number(p.number);
  const day = Number(p.day);
  const rest = isStudyRestDay(week, day);
  const track = query.track === "family" ? "family" : "adult";
  if (rest && query.view !== "notes")
    return <StudyRestDay week={week} track={track} />;
  const allocated = getStudyDay(week, day);
  if (allocated && query.view !== "notes")
    return (
      <StudyReader
        week={week}
        day={day}
        initialTrack={track}
        initialSource={query.source}
        initialAnchor={query.anchor}
      />
    );
  const legacy = (
    <LessonPage key={p.number + "-" + p.day} number={week} day={day} />
  );
  return allocated || rest ? (
    <GuestGate>
      <Link className="back-link" href={dailyStudyHref(week, day, track)}>
        ← 원문 읽기 · Official reader
      </Link>
      {legacy}
    </GuestGate>
  ) : (
    legacy
  );
}
