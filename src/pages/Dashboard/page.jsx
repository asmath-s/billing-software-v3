import dayjs from "dayjs";
import MainLayout from "../../layouts/MainLayout";
import { getLocalAmounts } from "../../api/localAmount";
import { useCallback, useEffect, useState } from "react";

const Dashboard = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [localSalesAmount, setLocalSalesAmount] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadLocalTotalAmount = useCallback(async () => {
    setLoading(true);

    try {
      let query = [];

      if (fromDate && toDate) {
        const from = dayjs(fromDate).format("YYYY-MM-DD");
        const to = dayjs(toDate).format("YYYY-MM-DD");

        query.push(`fromDate=${from}`);
        query.push(`toDate=${to}`);
      }

      const queryString = query.length ? `?${query.join("&")}` : "";

      const res = await getLocalAmounts(queryString);

      setLocalSalesAmount(res);
    } catch (error) {
      console.error("Local amounts fetch failed:", error);
      setLocalSalesAmount([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadLocalTotalAmount();
  }, [loadLocalTotalAmount]);
  return (
    <MainLayout>
      <div className="flex justify-between">
        <h1 className="text-2xl font-medium  mb-4">Dashboard</h1>{" "}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
