import { LessonPage } from "@/components/learning/learn";
export default async function Page({
  params,
}: {
  params: Promise<{ number: string; day: string }>;
}) {
  const p = await params;
  return (
    <LessonPage
      key={p.number + "-" + p.day}
      number={Number(p.number)}
      day={Number(p.day)}
    />
  );
}
