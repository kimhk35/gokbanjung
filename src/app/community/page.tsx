import { Suspense } from "react";
import { WallPage } from "@/components/community/wall";
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
        <WallPage />
      </Suspense>
    </>
  );
}
