import { lazy, Suspense } from "react";
import PreLoader from "../../components/Preloader/Preloader";

const LocalCustomerList = lazy(() => import("./page"));

const LocalCustomerListPage = () => {
  return (
    <Suspense fallback={<PreLoader />}>
      <LocalCustomerList />
    </Suspense>
  );
};

export default LocalCustomerListPage;
