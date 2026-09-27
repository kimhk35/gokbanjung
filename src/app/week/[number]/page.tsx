import { WeekPage } from "@/components/learning/learn";
export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  return <WeekPage number={Number((await params).number)} />;
}
