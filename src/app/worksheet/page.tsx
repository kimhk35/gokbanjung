import { Suspense } from "react";
import { WorksheetPage } from "@/components/learning/worksheet";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <WorksheetPage />
    </Suspense>
  );
}
