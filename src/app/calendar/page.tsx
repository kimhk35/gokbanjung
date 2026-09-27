import { Suspense } from "react";
import { CalendarPage } from "@/components/learning/journey";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <CalendarPage />
    </Suspense>
  );
}
