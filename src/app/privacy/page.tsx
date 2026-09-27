import { Suspense } from "react";
import { PrivacyPage } from "@/components/privacy";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <PrivacyPage />
    </Suspense>
  );
}
