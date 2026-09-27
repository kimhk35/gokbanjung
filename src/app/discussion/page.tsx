import { Suspense } from "react";
import { DiscussionPage } from "@/components/community/discussion";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <DiscussionPage />
    </Suspense>
  );
}
