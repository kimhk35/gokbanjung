import { LessonTextReader } from "@/components/notes/lesson-text-view";
export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  return <LessonTextReader week={Number((await params).number)} />;
}
