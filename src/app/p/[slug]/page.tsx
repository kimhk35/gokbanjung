import { PromptView } from "@/components/think/prompt-view";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="page">
      <PromptView slug={(await params).slug} />
    </div>
  );
}
