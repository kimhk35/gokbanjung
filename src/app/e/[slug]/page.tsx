import { EventDetail } from "@/components/ward/event-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <EventDetail slug={(await params).slug} />;
}
