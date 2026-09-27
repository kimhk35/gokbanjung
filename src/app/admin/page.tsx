import { Suspense } from "react";
import { AdminPage } from "@/components/admin/admin";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="skeleton" />
        </div>
      }
    >
      <AdminPage />
    </Suspense>
  );
}
