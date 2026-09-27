import { Suspense } from "react";
import { DiscussionPage } from "@/components/community/discussion";
import { ShareTabs } from "@/components/community/share-tabs";
export default function Page() {
  return (
    <>
      <ShareTabs />
      <Suspense
        fallback={
          <div className="page">
            <div className="skeleton" />
          </div>
        }
      >
        <DiscussionPage />
      </Suspense>
    </>
  );
}
