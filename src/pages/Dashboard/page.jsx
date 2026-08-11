import dayjs from "dayjs";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { getAdminExpenseAmounts } from "../../api/adminExpense";
import { getGstExpenseSummary } from "../../api/gstExpense";
import { getGstSalesSummary } from "../../api/gstList";
import { getLocalAmounts } from "../../api/localAmount";
import {
  getLocalAuthenticatedExpenseAmounts,
  getLocalExpenseAmounts,
} from "../../api/localExpense";
import AdminCard from "../../components/AdminCard/AdminCard";
import Datepicker from "../../components/Datepicker/Datepicker";
import { AccountIcon, CashIcon, GpayIcon } from "../../components/icons";
import MainLayout from "../../layouts/MainLayout";

/* -----------------------------------------------------------------
   Shared formatting / helpers
------------------------------------------------------------------*/

const formatAmount = (amount = 0) =>
  new Intl.NumberFormat("en-IN").format(
    Math.round((amount + Number.EPSILON) * 100) / 100,
  );

// Same rule AdminCard already uses for "Taken Amount": blue when healthy,
// orange when the balance has gone negative.
const balanceColor = (value = 0) =>
  value >= 0 ? "text-blue-600" : "text-orange-600";

const CHANNEL_ICON = {
  cash: <CashIcon color="#292D32" width="20" height="20" />,
  gpay: <GpayIcon color="#292D32" width="20" height="20" />,
  account: <AccountIcon color="#292D32" width="20" height="20" />,
};

/* -----------------------------------------------------------------
   Card primitives — same visual language as AdminCard
------------------------------------------------------------------*/

const Item = ({ label, value, color = "text-gray-800", channel }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
    <span className="text-gray-600 flex items-center gap-2">
      {channel && CHANNEL_ICON[channel]} {label}
    </span>
    <span className={`font-semibold ${color}`}>₹ {formatAmount(value)}</span>
  </div>
);

const SummaryTile = ({ title, value, color, bg, caption }) => (
  <div className={`${bg} rounded-xl p-4`}>
    <p className="text-sm text-gray-600">{title}</p>
    <h3 className={`text-2xl font-bold mt-1 ${color}`}>
      ₹ {formatAmount(value)}
    </h3>
    {caption && <p className="text-xs text-gray-500 mt-1">{caption}</p>}
  </div>
);

const DetailPanel = ({ title, color, items = [] }) => (
  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
    <h3 className={`font-semibold ${color} mb-3`}>{title}</h3>
    {items.map((item, i) => (
      <Item key={i} {...item} />
    ))}
  </div>
);

const tileCols = (count) =>
  count === 3 ? "grid-cols-3" : count === 2 ? "grid-cols-2" : "grid-cols-1";

// The general-purpose card: title + a row of headline tiles + one or two
// breakdown panels underneath. Every section below is just data fed into
// this one shell, so the whole dashboard shares one look.
const FinanceCard = ({ title, titleColor, tiles = [], panels = [] }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6">
    <h2 className={`text-2xl font-bold ${titleColor} mb-3`}>{title}</h2>

    {tiles.length > 0 && (
      <div className={`grid ${tileCols(tiles.length)} gap-4 mb-6`}>
        {tiles.map((tile, i) => (
          <SummaryTile key={i} {...tile} />
        ))}
      </div>
    )}

    {panels.length > 0 && (
      <div
        className={`grid ${panels.length > 1 ? "md:grid-cols-2" : "grid-cols-1"} gap-5`}
      >
        {panels.map((panel, i) => (
          <DetailPanel key={i} {...panel} />
        ))}
      </div>
    )}
  </div>
);

// Lighter card for a single figure with a small optional breakdown
// (Local Need to Get, GST Need to Pay, etc.)
const StatCard = ({ title, titleColor, value, valueColor, items = [] }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6">
    <h2 className={`text-lg font-bold ${titleColor} mb-1`}>{title}</h2>
    <p className={`text-2xl font-bold ${valueColor} mb-4`}>
      ₹ {formatAmount(value)}
    </p>
    {items.length > 0 && (
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        {items.map((item, i) => (
          <Item key={i} {...item} />
        ))}
      </div>
    )}
  </div>
);

const SectionHeading = ({ children }) => (
  <h2 className="text-lg font-semibold text-gray-700 mt-10 mb-4 first:mt-0">
    {children}
  </h2>
);

const sectionMotion = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

/* -----------------------------------------------------------------
   Data shape expected from getLocalAmounts (`localSalesAmount`)
   Flat, camelCase — same convention as adminExpenseAmount already uses
   (asmathTotalGet, asmathGetInCash, ...). Rename these to match your
   real API response; every section reads straight off this object.

   Local Info:
     localSalesCash, localCashExpenses, localCashBalance,
     localCashPaid, localCashPaidPending, localCashParty, localCashUnapprove,
     localCashReceive, debtCashReceive, gstCash, localCashAdminPublicReceive,
     localCashExpense, debtCashExpense, adminPublicCashExpense,
     localSalesGpay, localGpayExpenses, localGpayBalance,
     localGpayPaid, localGpayPaidPending, localGpayParty, localGpayUnapprove,
     localGpayReceive, debtGpayReceive, gstGpay, localGpayAdminPublicReceive,
     localGpayExpense, debtGpayExpense, adminPublicGpayExpense

   Tax Info:
     gstSalesAmount, gstSalesBase, gstSalesTax,
     gstExpenseAmount, gstExpenseBase, gstExpenseTax, gstTax

   Finalize:
     finalizeTotalAmount, finalizeTotalExpense, finalizeBalance,
     finalizeCash, finalizeGpay, finalizeGstBank,
     finalizeLocalNeedToGet, finalizeGstNeedToGet,
     finalizeExpenseCash, finalizeExpenseGpay, finalizeExpenseGstBank,
     finalizeGstNeedToPay

   Local Sales & Expenses:
     localCash, localCashExpenseTotal, localCashBalance2,
     localCash2Paid, localCash2PaidPending, localCash2Party, localCash2Receive,
     debtCash2, gstCash2, adminCash, localCash2Expense, debtCash2Expense, adminCashExpense,
     localGpay, localGpayExpenseTotal, localGpayBalance2,
     localGpay2Paid, localGpay2PaidPending, localGpay2Party, localGpay2Receive,
     debtGpay2, gstGpay2, adminGpay, localGpay2Expense, debtGpay2Expense, adminGpayExpense,
     localNeedToGet, localPending, localPartyPending,
     localUnapproved, localUnapprovedCash, localUnapprovedGpay

   Official Bank:
     bankReceivedAmount, bankExpenseAmount, bankBalance,
     gstSalesCredited, adminGstCredited, gstSalesDebited, adminGstDebited,
     gstNeedToGet, gstNeedToPay
------------------------------------------------------------------*/

/* -----------------------------------------------------------------
   Dashboard
------------------------------------------------------------------*/

const Dashboard = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [localSalesAmount, setLocalSalesAmount] = useState({});
  const [localExpenseAmount, setLocalExpenseAmount] = useState([]);
  const [localAuthenticatedExpenseAmount, setLocalAuthenticatedExpenseAmount] =
    useState([]);
  const [loading, setLoading] = useState(false);
  const [adminExpenseAmount, setAdminExpenseAmount] = useState({});
  const [gstSalesSummary, setGstSalesSummary] = useState(null);
  const [gstExpenseSummary, setGstExpenseSummary] = useState(null);

  const loadGstExpenseSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (fromDate && toDate) {
        params.set("fromDate", dayjs(fromDate).format("YYYY-MM-DD"));
        params.set("toDate", dayjs(toDate).format("YYYY-MM-DD"));
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await getGstExpenseSummary(queryString);
      setGstExpenseSummary(res);
    } catch (err) {
      console.error("GST expense summary fetch failed:", err);
      setGstExpenseSummary(null);
    }
  }, [fromDate, toDate]);

  const loadGstSalesSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (fromDate && toDate) {
        params.set("fromDate", dayjs(fromDate).format("YYYY-MM-DD"));
        params.set("toDate", dayjs(toDate).format("YYYY-MM-DD"));
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await getGstSalesSummary(queryString);
      setGstSalesSummary(res);
    } catch (err) {
      console.error("GST sales summary fetch failed:", err);
      setGstSalesSummary(null);
    }
  }, [fromDate, toDate]);

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
      setLocalSalesAmount({});
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const loadLocalExpenseTotalAmount = useCallback(async () => {
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

      const res = await getLocalExpenseAmounts(queryString);

      setLocalExpenseAmount(res);
    } catch (error) {
      console.error("Local amounts fetch failed:", error);
      setLocalExpenseAmount([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const loadAuthenticatedLocalExpenseTotalAmount = useCallback(async () => {
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

      const res = await getLocalAuthenticatedExpenseAmounts(queryString);

      setLocalAuthenticatedExpenseAmount(res);
    } catch (error) {
      console.error("Local amounts fetch failed:", error);
      setLocalAuthenticatedExpenseAmount([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const LoadAdminAmount = useCallback(async () => {
    setLoading(true);

    try {
      let query = [];

      query.push(`sort[0]=date:desc`);
      query.push(`filters[approved][$eq]=true`);
      query.push(`filters[current_status][$eq]=admin`);

      if (fromDate && toDate) {
        const from = dayjs(fromDate).format("YYYY-MM-DD");
        const to = dayjs(toDate).format("YYYY-MM-DD");

        query.push(`fromDate=${from}`);
        query.push(`toDate=${to}`);
      }
      const queryString = query.length ? `?${query.join("&")}` : "";

      const res = await getAdminExpenseAmounts(queryString);

      setAdminExpenseAmount(res);
    } catch (error) {
      console.error("Admin amounts fetch failed:", error);
      setAdminExpenseAmount({});
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadGstSalesSummary();
    loadGstExpenseSummary();
    loadLocalExpenseTotalAmount();
    loadLocalTotalAmount();
    LoadAdminAmount();
    loadAuthenticatedLocalExpenseTotalAmount();
  }, [
    loadGstSalesSummary,
    loadGstExpenseSummary,
    loadLocalExpenseTotalAmount,
    loadAuthenticatedLocalExpenseTotalAmount,
    loadLocalTotalAmount,
    LoadAdminAmount,
  ]);

  return (
    <MainLayout>
      <h1 className="text-2xl font-medium mb-4">Dashboard</h1>

      <Datepicker
        type="multipleDatePicker"
        FromDate={fromDate}
        ToDate={toDate}
        setFromDate={(d) => {
          setFromDate(d);
        }}
        setToDate={(d) => {
          setToDate(d);
        }}
      />

      {loading && <p className="text-sm text-gray-400 mb-4">Loading…</p>}

      {/* Local Info */}
      <SectionHeading>Local Info</SectionHeading>
      <motion.div
        className="grid grid-cols-3 gap-4"
        {...sectionMotion}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <FinanceCard
          title="Receive Cash"
          titleColor="text-emerald-800"
          tiles={[
            {
              title: "Total Cash",
              value:
                localSalesAmount?.local_total?.total_cash +
                localAuthenticatedExpenseAmount?.total?.total_rec_cash +
                gstSalesSummary?.total_cash,
              color: "text-green-600",
              bg: "bg-green-50",
            },
          ]}
          panels={[
            {
              title: "Sales Receive breakdown",
              color: "text-green-700",
              items: [
                {
                  label: "Unapproved",
                  value: localSalesAmount?.local_list?.total_cash,
                },
                {
                  label: "Paid",
                  value: localSalesAmount?.local_paid?.total_cash,
                },
                {
                  label: "Pending",
                  value: localSalesAmount?.local_pending?.total_cash,
                },
                {
                  label: "Party",
                  value: localSalesAmount?.local_party?.total_cash,
                },

                { label: "GST", value: gstSalesSummary?.total_cash },
              ],
            },
            {
              title: "Expense Receive breakdown",
              color: "text-green-700",
              items: [
                {
                  label: "Unapproved",
                  value:
                    localAuthenticatedExpenseAmount?.expense?.total_rec_cash,
                },
                {
                  label: "Approved",
                  value:
                    localAuthenticatedExpenseAmount?.approved?.total_rec_cash,
                },
                {
                  label: "Production",
                  value:
                    localAuthenticatedExpenseAmount?.production?.total_rec_cash,
                },
                {
                  label: "Hub",
                  value: localAuthenticatedExpenseAmount?.hub?.total_rec_cash,
                },
                {
                  label: "Admin",
                  value: localAuthenticatedExpenseAmount?.admin?.total_rec_cash,
                },
              ],
            },
          ]}
        />

        <FinanceCard
          title="Expense Cash"
          titleColor="text-red-700"
          tiles={[
            {
              title: "Total Cash",
              value: localAuthenticatedExpenseAmount?.total?.total_exp_cash,
              color: "text-red-600",
              bg: "bg-red-50",
            },
          ]}
          panels={[
            {
              title: "Expense breakdown",
              color: "text-red-700",
              items: [
                {
                  label: "Unapproved",
                  value:
                    localAuthenticatedExpenseAmount?.expense?.total_exp_cash,
                },
                {
                  label: "Approved",
                  value:
                    localAuthenticatedExpenseAmount?.approved?.total_exp_cash,
                },
                {
                  label: "Production",
                  value:
                    localAuthenticatedExpenseAmount?.production?.total_exp_cash,
                },
                {
                  label: "Hub",
                  value: localAuthenticatedExpenseAmount?.hub?.total_exp_cash,
                },
                {
                  label: "Admin",
                  value: localAuthenticatedExpenseAmount?.admin?.total_exp_cash,
                },
              ],
            },
          ]}
        />

        <FinanceCard
          title="Balance Cash"
          titleColor="text-yellow-700"
          tiles={[
            {
              title: "Total Cash",
              value:
                localSalesAmount?.local_total?.total_cash +
                localAuthenticatedExpenseAmount?.total?.total_rec_cash +
                gstSalesSummary?.total_cash -
                localAuthenticatedExpenseAmount?.total?.total_exp_cash,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
            },
          ]}
          panels={[]}
        />

        <FinanceCard
          title="Receive GPay"
          titleColor="text-emerald-800"
          tiles={[
            {
              title: "Total Gpay",
              value:
                localSalesAmount?.local_total?.total_gpay +
                localAuthenticatedExpenseAmount?.total?.total_rec_gpay +
                gstSalesSummary?.total_gpay,
              color: "text-green-600",
              bg: "bg-green-50",
            },
          ]}
          panels={[
            {
              title: "Sales Receive breakdown",
              color: "text-green-700",
              items: [
                {
                  label: "Unapproved",
                  value: localSalesAmount?.local_list?.total_gpay,
                },
                {
                  label: "Paid",
                  value: localSalesAmount?.local_paid?.total_gpay,
                },
                {
                  label: "Pending",
                  value: localSalesAmount?.local_pending?.total_gpay,
                },
                {
                  label: "Party",
                  value: localSalesAmount?.local_party?.total_gpay,
                },

                { label: "GST", value: gstSalesSummary?.total_gpay },
              ],
            },
            {
              title: "Expense Receive breakdown",
              color: "text-green-700",
              items: [
                {
                  label: "Unapproved",
                  value:
                    localAuthenticatedExpenseAmount?.expense?.total_exp_gpay,
                },
                {
                  label: "Approved",
                  value:
                    localAuthenticatedExpenseAmount?.approved?.total_exp_gpay,
                },
                {
                  label: "Production",
                  value:
                    localAuthenticatedExpenseAmount?.production?.total_exp_gpay,
                },
                {
                  label: "Hub",
                  value: localAuthenticatedExpenseAmount?.hub?.total_exp_gpay,
                },
                {
                  label: "Admin",
                  value: localAuthenticatedExpenseAmount?.admin?.total_exp_gpay,
                },
              ],
            },
          ]}
        />

        <FinanceCard
          title="Expense GPay"
          titleColor="text-red-700"
          tiles={[
            {
              title: "Total Expenses",
              value: localAuthenticatedExpenseAmount?.total?.total_exp_gpay,
              color: "text-red-600",
              bg: "bg-red-50",
            },
          ]}
          panels={[
            {
              title: "Expense breakdown",
              color: "text-red-700",
              items: [
                {
                  label: "Unapproved",
                  value:
                    localAuthenticatedExpenseAmount?.expense?.total_exp_gpay,
                },
                {
                  label: "Approved",
                  value:
                    localAuthenticatedExpenseAmount?.approved?.total_exp_gpay,
                },
                {
                  label: "Production",
                  value:
                    localAuthenticatedExpenseAmount?.production?.total_exp_gpay,
                },
                {
                  label: "Hub",
                  value: localAuthenticatedExpenseAmount?.hub?.total_exp_gpay,
                },
                {
                  label: "Admin",
                  value: localAuthenticatedExpenseAmount?.admin?.total_exp_gpay,
                },
              ],
            },
          ]}
        />

        <FinanceCard
          title="Balance Gpay"
          titleColor="text-yellow-700"
          tiles={[
            {
              title: "Total GPay",
              value:
                localSalesAmount?.local_total?.total_gpay +
                localAuthenticatedExpenseAmount?.total?.total_rec_gpay +
                gstSalesSummary?.total_gpay -
                localAuthenticatedExpenseAmount?.total?.total_exp_gpay,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
            },
          ]}
          panels={[]}
        />
      </motion.div>

      {/* Tax Info */}
      <SectionHeading>Tax Info</SectionHeading>
      <motion.div
        {...sectionMotion}
        transition={{ duration: 0.4, delay: 0.05, ease: "easeInOut" }}
      >
        <FinanceCard
          title="Tax Info"
          titleColor="text-purple-800"
          tiles={[
            {
              title: "GST Sales",
              value: gstSalesSummary?.total_base,
              color: "text-green-600",
              bg: "bg-green-50",
              caption: `Tax ₹ ${formatAmount(gstSalesSummary?.total_tax)}`,
            },
            {
              title: "GST Expenses",
              value: gstExpenseSummary?.total_base,
              color: "text-red-600",
              bg: "bg-red-50",
              caption: `Tax ₹ ${formatAmount(gstExpenseSummary?.total_tax)}`,
            },
            {
              title: "GST Tax",
              value: gstSalesSummary?.total_tax - gstExpenseSummary?.total_tax,
              color: balanceColor(
                gstSalesSummary?.total_tax - gstExpenseSummary?.total_tax,
              ),
              bg: "bg-blue-50",
            },
          ]}
        />
      </motion.div>

      {/* on hand */}
      <SectionHeading>ON Hand</SectionHeading>
      <motion.div
        {...sectionMotion}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
      >
        <FinanceCard
          title="On Hand"
          titleColor="text-amber-800"
          tiles={[
            {
              title: "Total Amount",
              value:
                localSalesAmount?.local_total?.total_cash +
                localExpenseAmount?.total?.total_rec_cash +
                gstSalesSummary?.total_cash +
                localSalesAmount?.local_total?.total_gpay +
                localExpenseAmount?.total?.total_rec_gpay +
                gstSalesSummary?.total_gpay +
                gstSalesSummary?.total_account,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              title: "Total Expense",
              value:
                localExpenseAmount?.total?.total_exp_cash +
                localExpenseAmount?.total?.total_exp_gpay +
                gstExpenseSummary?.total_account,
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              title: "Balance",
              value:
                localSalesAmount?.local_total?.total_cash +
                localExpenseAmount?.total?.total_rec_cash +
                gstSalesSummary?.total_cash +
                localSalesAmount?.local_total?.total_gpay +
                localExpenseAmount?.total?.total_rec_gpay +
                gstSalesSummary?.total_gpay +
                gstSalesSummary?.total_account -
                (localExpenseAmount?.total?.total_exp_cash +
                  localExpenseAmount?.total?.total_exp_gpay +
                  gstExpenseSummary?.total_account),
              color: balanceColor(
                localSalesAmount?.local_total?.total_cash +
                  localExpenseAmount?.total?.total_rec_cash +
                  gstSalesSummary?.total_cash +
                  localSalesAmount?.local_total?.total_gpay +
                  localExpenseAmount?.total?.total_rec_gpay +
                  gstSalesSummary?.total_gpay +
                  gstSalesSummary?.total_account -
                  (localExpenseAmount?.total?.total_exp_cash +
                    localExpenseAmount?.total?.total_exp_gpay +
                    gstExpenseSummary?.total_account),
              ),
              bg: "bg-blue-50",
            },
          ]}
          panels={[
            {
              title: "Total Amount breakdown",
              color: "text-green-700",
              items: [
                {
                  label: "Cash",
                  value:
                    localSalesAmount?.local_total?.total_cash +
                    localExpenseAmount?.total?.total_rec_cash +
                    gstSalesSummary?.total_cash,

                  channel: "cash",
                },
                {
                  label: "GPay",
                  value:
                    localSalesAmount?.local_total?.total_gpay +
                    localExpenseAmount?.total?.total_rec_gpay +
                    gstSalesSummary?.total_gpay,
                  channel: "gpay",
                },
                {
                  label: "GST Bank",
                  value: gstSalesSummary?.total_account,
                  channel: "account",
                },
              ],
            },
            {
              title: "Total Expense breakdown",
              color: "text-red-700",
              items: [
                {
                  label: "Cash",
                  value: localExpenseAmount?.total?.total_exp_cash,
                  channel: "cash",
                },
                {
                  label: "GPay",
                  value: localExpenseAmount?.total?.total_exp_gpay,
                  channel: "gpay",
                },
                {
                  label: "GST Bank",
                  value: gstExpenseSummary?.total_account,
                  channel: "account",
                },
              ],
            },
            {
              title: "Total Balance breakdown",
              color: "text-red-700",
              items: [
                {
                  label: "Cash",
                  value:
                    localSalesAmount?.local_total?.total_cash +
                    localExpenseAmount?.total?.total_rec_cash +
                    gstSalesSummary?.total_cash -
                    localExpenseAmount?.total?.total_exp_cash,
                  channel: "cash",
                },
                {
                  label: "GPay",
                  value:
                    localSalesAmount?.local_total?.total_gpay +
                    localExpenseAmount?.total?.total_rec_gpay +
                    gstSalesSummary?.total_gpay -
                    localExpenseAmount?.total?.total_exp_gpay,
                  channel: "gpay",
                },
                {
                  label: "GST Bank",
                  value:
                    gstSalesSummary?.total_account -
                    gstExpenseSummary?.total_account,
                  channel: "account",
                },
              ],
            },
          ]}
        />
      </motion.div>

      <SectionHeading>Finalize</SectionHeading>
      <motion.div
        {...sectionMotion}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
      >
        <FinanceCard
          title="Finalize"
          titleColor="text-amber-800"
          tiles={[
            {
              title: "Total Amount",
              value:
                localSalesAmount?.local_total?.total_cash +
                localExpenseAmount?.total?.total_rec_cash +
                gstSalesSummary?.total_cash +
                localSalesAmount?.local_total?.total_gpay +
                localExpenseAmount?.total?.total_rec_gpay +
                gstSalesSummary?.total_gpay +
                gstSalesSummary?.total_account +
                localSalesAmount?.local_pending?.total_balance +
                localSalesAmount?.local_party?.total_balance,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              title: "Total Expense",
              value:
                localExpenseAmount?.total?.total_exp_cash +
                localExpenseAmount?.total?.total_exp_gpay +
                gstExpenseSummary?.total_account,
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              title: "Balance",
              value:
                localSalesAmount?.local_total?.total_cash +
                localExpenseAmount?.total?.total_rec_cash +
                gstSalesSummary?.total_cash +
                localSalesAmount?.local_total?.total_gpay +
                localExpenseAmount?.total?.total_rec_gpay +
                gstSalesSummary?.total_gpay +
                gstSalesSummary?.total_account +
                localSalesAmount?.local_pending?.total_balance +
                localSalesAmount?.local_party?.total_balance -
                (localExpenseAmount?.total?.total_exp_cash +
                  localExpenseAmount?.total?.total_exp_gpay +
                  gstExpenseSummary?.total_account +
                  gstExpenseSummary?.total_balance),
              color: balanceColor(
                localSalesAmount?.local_total?.total_cash +
                  localExpenseAmount?.total?.total_rec_cash +
                  gstSalesSummary?.total_cash +
                  localSalesAmount?.local_total?.total_gpay +
                  localExpenseAmount?.total?.total_rec_gpay +
                  gstSalesSummary?.total_gpay +
                  gstSalesSummary?.total_account +
                  localSalesAmount?.local_pending?.total_balance +
                  localSalesAmount?.local_party?.total_balance -
                  (localExpenseAmount?.total?.total_exp_cash +
                    localExpenseAmount?.total?.total_exp_gpay +
                    gstExpenseSummary?.total_account +
                    gstExpenseSummary?.total_balance),
              ),
              bg: "bg-blue-50",
            },
          ]}
          panels={[
            {
              title: "Total Amount breakdown",
              color: "text-green-700",
              items: [
                {
                  label: "Cash",
                  value:
                    localSalesAmount?.local_total?.total_cash +
                    localExpenseAmount?.total?.total_rec_cash +
                    gstSalesSummary?.total_cash,

                  channel: "cash",
                },
                {
                  label: "GPay",
                  value:
                    localSalesAmount?.local_total?.total_gpay +
                    localExpenseAmount?.total?.total_rec_gpay +
                    gstSalesSummary?.total_gpay,
                  channel: "gpay",
                },
                {
                  label: "GST Bank",
                  value: gstSalesSummary?.total_account,
                  channel: "account",
                },
                {
                  label: "Local Need to Get",
                  value:
                    localSalesAmount?.local_pending?.total_balance +
                    localSalesAmount?.local_party?.total_balance,
                  channel: "account",
                },
                {
                  label: "GST Need to Get",
                  value: gstSalesSummary?.total_balance,
                  channel: "account",
                },
              ],
            },
            {
              title: "Total Expense breakdown",
              color: "text-red-700",
              items: [
                {
                  label: "Cash",
                  value: localExpenseAmount?.total?.total_exp_cash,
                  channel: "cash",
                },
                {
                  label: "GPay",
                  value: localExpenseAmount?.total?.total_exp_gpay,
                  channel: "gpay",
                },
                {
                  label: "GST Bank",
                  value: gstExpenseSummary?.total_account,
                  channel: "account",
                },
                {
                  label: "GST Need to Pay",
                  value: gstExpenseSummary?.total_balance,
                  channel: "account",
                },
              ],
            },
          ]}
        />
      </motion.div>

      <SectionHeading>Summary</SectionHeading>
      <motion.div
        {...sectionMotion}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
      >
        <FinanceCard
          title="Summary"
          titleColor="text-amber-800"
          tiles={[
            {
              title: "Total Amount",
              value:
                localSalesAmount?.sales_total + gstSalesSummary?.total_sales,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              title: "Total Expense",
              value:
                localExpenseAmount?.local_expense_total +
                gstExpenseSummary?.total_expense,
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              title: "Balance",
              value:
                localSalesAmount?.sales_total +
                gstSalesSummary?.total_sales -
                localExpenseAmount?.local_expense_total -
                gstExpenseSummary?.total_expense,
              color: balanceColor(
                localSalesAmount?.sales_total +
                  gstSalesSummary?.total_sales -
                  localExpenseAmount?.local_expense_total -
                  gstExpenseSummary?.total_expense,
              ),

              bg: "bg-blue-50",
            },
          ]}
          panels={[
            {
              title: "Total Amount breakdown",
              color: "text-green-700",
              items: [
                {
                  label: "Local Sales",
                  value: localSalesAmount?.sales_total,
                },
                {
                  label: "Gst Sales",
                  value: gstSalesSummary?.total_sales,
                },
              ],
            },
            {
              title: "Total Expense breakdown",
              color: "text-red-700",
              items: [
                {
                  label: "Local Expense",
                  value: localExpenseAmount?.local_expense_total,
                },
                {
                  label: "Gst Expense",
                  value: gstExpenseSummary?.total_expense,
                },
              ],
            },
          ]}
        />
      </motion.div>

      {/* Admin Users */}
      <SectionHeading>Admin Users</SectionHeading>
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6"
        {...sectionMotion}
        transition={{ duration: 0.4, delay: 0.25, ease: "easeInOut" }}
      >
        <AdminCard
          title="Asmath"
          titleColor={"text-sky-800"}
          receivedAmount={adminExpenseAmount?.asmathTotalGet}
          expenseAmount={adminExpenseAmount?.asmathTotalGive}
          balanceAmount={adminExpenseAmount?.asmathTotalBalance}
          getCash={adminExpenseAmount?.asmathGetInCash}
          getGpay={adminExpenseAmount?.asmathGetInGapy}
          getAccount={adminExpenseAmount?.asmathGetInAccount}
          giveCash={adminExpenseAmount?.asmathGiveInCash}
          giveGpay={adminExpenseAmount?.asmathGiveInGapy}
          giveAccount={adminExpenseAmount?.asmathGiveInAccount}
        />
        <AdminCard
          title="Ibu"
          titleColor={"text-sky-800"}
          receivedAmount={adminExpenseAmount?.ibuTotalGet}
          expenseAmount={adminExpenseAmount?.ibuTotalGive}
          balanceAmount={adminExpenseAmount?.ibuTotalBalance}
          getCash={adminExpenseAmount?.ibuGetInCash}
          getGpay={adminExpenseAmount?.ibuGetInGapy}
          getAccount={adminExpenseAmount?.ibuGetInAccount}
          giveCash={adminExpenseAmount?.ibuGiveInCash}
          giveGpay={adminExpenseAmount?.ibuGiveInGapy}
          giveAccount={adminExpenseAmount?.ibuGiveInAccount}
        />
      </motion.div>
    </MainLayout>
  );
};

export default Dashboard;
