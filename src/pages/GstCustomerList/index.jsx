import { lazy, Suspense } from "react";
import PreLoader from "../../components/Preloader/Preloader";

const GstCustomerList = lazy(() => import("./page"));

const GstCustomerListPage = () => {
  return (
    <Suspense fallback={<PreLoader />}>
      <GstCustomerList />
    </Suspense>
  );
};

export default GstCustomerListPage;
