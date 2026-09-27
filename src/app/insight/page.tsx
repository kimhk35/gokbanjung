import { Suspense } from "react";
import { InsightPage } from "@/components/learning/insight";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <InsightPage />
    </Suspense>
  );
}
