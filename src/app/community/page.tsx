import { Suspense } from "react";
import { WallPage } from "@/components/community/wall";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <WallPage />
    </Suspense>
  );
}
