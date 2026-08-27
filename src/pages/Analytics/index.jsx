import { lazy, Suspense } from "react";
import PreLoader from "../../components/Preloader/Preloader";

const Analytics = lazy(() => import("./page"));

const AnalyticsPage = () => {
  return (
    <Suspense fallback={<PreLoader />}>
      <Analytics />
    </Suspense>
  );
};

export default AnalyticsPage;
