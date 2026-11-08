import { LessonPage } from "@/components/learning/learn";
import { StudyReader } from "@/components/learning/study-reader";
import { getStudyDay, dailyStudyHref } from "@/lib/cfm-study-plan";
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
  const allocated = getStudyDay(Number(p.number), Number(p.day));
  if (allocated && query.view !== "notes")
    return (
      <StudyReader
        week={Number(p.number)}
        day={Number(p.day)}
        initialTrack={query.track === "family" ? "family" : "adult"}
        initialSource={query.source}
        initialAnchor={query.anchor}
      />
    );
  const legacy = (
    <LessonPage
      key={p.number + "-" + p.day}
      number={Number(p.number)}
      day={Number(p.day)}
    />
  );
  return allocated ? (
    <GuestGate>
      <Link
        className="back-link"
        href={dailyStudyHref(Number(p.number), Number(p.day))}
      >
        ← 원문 읽기 · Official reader
      </Link>
      {legacy}
    </GuestGate>
  ) : (
    legacy
  );
}
