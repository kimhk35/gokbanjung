import { ThinkPage } from "@/components/think/think-page";
import { ShareTabs } from "@/components/community/share-tabs";
export const metadata = { title: "함께 생각하기 · 곡반정와드" };
export default function Page() {
  return (
    <>
      <ShareTabs />
      <ThinkPage />
    </>
  );
}
