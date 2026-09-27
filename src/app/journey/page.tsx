import { Suspense } from "react";
import { JourneyPage } from "@/components/learning/journey";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <JourneyPage />
    </Suspense>
  );
}
