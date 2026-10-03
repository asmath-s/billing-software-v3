import Tooltip from "@mui/joy/Tooltip";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
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
import { useFinancialYear } from "../../context/financial-year-context";
import MainLayout from "../../layouts/MainLayout";
import { resolveApiDateRange } from "../../utils/financialYear";

/* -----------------------------------------------------------------
   Shared formatting / helpers
------------------------------------------------------------------*/

const formatAmount = (amount = 0) =>
  new Intl.NumberFormat("en-IN").format(
    Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100,
  );

const balanceColor = (value = 0) =>
  Number(value || 0) >= 0 ? "text-blue-600" : "text-red-600";

const CHANNEL_ICON = {
  cash: <CashIcon color="#6B7280" width="16" height="16" />,
  gpay: <GpayIcon color="#6B7280" width="16" height="16" />,
  account: <AccountIcon color="#6B7280" width="16" height="16" />,
};

/* -----------------------------------------------------------------
   Dashboard UI primitives
   NOTE: These components only change presentation. The dashboard
   data, calculations, sections, order and card contents are kept
   exactly as in the original implementation.
------------------------------------------------------------------*/

const BreakdownTooltip = ({ title, sections, items }) => {
  const contentSections = sections || (items ? [{ items }] : []);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-2xl backdrop-blur-md min-w-[210px] max-w-[280px]">
      {title && (
        <div className="mb-2 pb-1.5 border-b border-slate-800 font-semibold text-white tracking-wide">
          {title}
        </div>
      )}
      <div className="space-y-2.5">
        {contentSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {sec.title && (
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {sec.title}
              </div>
            )}
            <div className="space-y-1">
              {sec.items?.map((it, itemIdx) => {
                const val = Number(it.value || 0);
                const isZero = val === 0;
                return (
                  <div
                    key={itemIdx}
                    className={`flex items-center justify-between gap-3 text-[12px] ${
                      isZero ? "text-slate-400" : "text-slate-100 font-medium"
                    }`}
                  >
                    <span className="truncate">{it.label}</span>
                    <span className="shrink-0 font-semibold">
                      : ₹ {formatAmount(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BalanceTableTooltip = ({
  title,
  rows = [],
  totalRec = 0,
  totalExp = 0,
  totalBal = 0,
}) => (
  <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-2xl backdrop-blur-md min-w-[360px] max-w-[460px]">
    {title && (
      <div className="mb-2 pb-1.5 border-b border-slate-800 font-semibold text-white tracking-wide text-xs">
        {title}
      </div>
    )}
    <div className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-800/40">
      <table className="w-full text-right border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/90 font-semibold text-slate-300">
            <th className="px-2.5 py-1.5 text-left border-r border-slate-700/80 whitespace-nowrap">
              Category
            </th>
            <th className="px-2.5 py-1.5 border-r border-slate-700/80">
              Receive
            </th>
            <th className="px-2.5 py-1.5 border-r border-slate-700/80">
              Expense
            </th>
            <th className="px-2.5 py-1.5">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rec = Number(r.rec || 0);
            const exp = Number(r.exp || 0);
            const bal = Number(r.bal !== undefined ? r.bal : rec - exp);
            const isAllZero = rec === 0 && exp === 0 && bal === 0;

            return (
              <tr
                key={i}
                className={`border-b border-slate-800/60 transition-colors hover:bg-slate-800/40 ${
                  r.highlight ? "bg-amber-950/25" : ""
                }`}
              >
                <td
                  className={`px-2.5 py-1 text-left font-medium border-r border-slate-700/80 whitespace-nowrap ${
                    r.highlight
                      ? "text-amber-300 font-semibold"
                      : isAllZero
                        ? "text-slate-400"
                        : "text-slate-200"
                  }`}
                >
                  {r.label}
                </td>
                <td
                  className={`px-2.5 py-1 border-r border-slate-700/80 font-mono ${
                    rec === 0
                      ? "text-slate-500"
                      : "text-emerald-400 font-medium"
                  }`}
                >
                  ₹ {formatAmount(rec)}
                </td>
                <td
                  className={`px-2.5 py-1 border-r border-slate-700/80 font-mono ${
                    exp === 0 ? "text-slate-500" : "text-red-400 font-medium"
                  }`}
                >
                  ₹ {formatAmount(exp)}
                </td>
                <td
                  className={`px-2.5 py-1 font-mono font-semibold ${
                    bal === 0
                      ? "text-slate-500"
                      : bal > 0
                        ? "text-blue-400"
                        : "text-red-400"
                  }`}
                >
                  ₹ {formatAmount(bal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-700 bg-slate-800/90 font-bold text-[12px] text-white">
            <td className="px-2.5 py-1.5 text-left border-r border-slate-700/80">
              Total
            </td>
            <td className="px-2.5 py-1.5 border-r border-slate-700/80 text-emerald-400 font-mono">
              ₹ {formatAmount(totalRec)}
            </td>
            <td className="px-2.5 py-1.5 border-r border-slate-700/80 text-red-400 font-mono">
              ₹ {formatAmount(totalExp)}
            </td>
            <td
              className={`px-2.5 py-1.5 font-mono ${
                Number(totalBal || 0) >= 0 ? "text-blue-400" : "text-red-400"
              }`}
            >
              ₹ {formatAmount(totalBal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

const Item = ({ label, value, color = "text-gray-800", channel, tooltip }) => {
  const content = (
    <div
      className={`group flex min-h-[38px] items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 ${
        tooltip
          ? "cursor-help transition-colors hover:bg-slate-100/60 rounded-md px-1.5 -mx-1.5"
          : ""
      }`}
    >
      <span className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-slate-500">
        {channel && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100">
            {CHANNEL_ICON[channel]}
          </span>
        )}
        <span className="truncate">{label}</span>
        {tooltip && (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-[10px] font-semibold text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
            i
          </span>
        )}
      </span>
      <span className={`shrink-0 text-[15px] font-semibold ${color}`}>
        ₹ {formatAmount(value)}
      </span>
    </div>
  );

  if (!tooltip) return content;

  const tooltipTitle = React.isValidElement(tooltip) ? (
    tooltip
  ) : typeof tooltip === "object" && tooltip !== null ? (
    <BreakdownTooltip {...tooltip} />
  ) : (
    tooltip
  );

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      arrow
      variant="plain"
      sx={{
        bgcolor: "transparent",
        p: 0,
        boxShadow: "none",
      }}
    >
      {content}
    </Tooltip>
  );
};

const SummaryTile = ({ title, value, color, bg, caption, tooltip }) => {
  const content = (
    <div
      className={`${bg} rounded-xl border border-white/80 px-4 py-3.5 ${
        tooltip ? "cursor-help transition-transform hover:-translate-y-0.5" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        {tooltip && (
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black/5 text-[10px] font-semibold text-slate-500">
            i
          </span>
        )}
      </div>
      <h3 className={`mt-1 text-xl font-bold tracking-tight ${color}`}>
        ₹ {formatAmount(value)}
      </h3>
      {caption && <p className="mt-1 text-xs text-slate-400">{caption}</p>}
    </div>
  );

  if (!tooltip) return content;

  const tooltipTitle = React.isValidElement(tooltip) ? (
    tooltip
  ) : typeof tooltip === "object" && tooltip !== null ? (
    <BreakdownTooltip {...tooltip} />
  ) : (
    tooltip
  );

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      arrow
      variant="plain"
      sx={{
        bgcolor: "transparent",
        p: 0,
        boxShadow: "none",
      }}
    >
      {content}
    </Tooltip>
  );
};

const DetailPanel = ({ title, color, items = [] }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
    <div className="mb-1.5 flex items-center justify-between">
      <h3 className={` font-semibold ${color}`}>{title}</h3>
    </div>
    <div>
      {items.map((item, i) => (
        <Item key={i} {...item} />
      ))}
    </div>
  </div>
);

const tileCols = (count) =>
  count === 3 ? "grid-cols-3" : count === 2 ? "grid-cols-2" : "grid-cols-1";

const FinanceCard = ({ title, titleColor, tiles = [], panels = [] }) => (
  <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
    <div className="border-b border-slate-100 px-4 py-3.5">
      <h2 className={`text-2xl font-bold ${titleColor}`}>{title}</h2>
    </div>

    <div className="p-4">
      {tiles.length > 0 && (
        <div className={`grid ${tileCols(tiles.length)} gap-3 mb-3`}>
          {tiles.map((tile, i) => (
            <SummaryTile key={i} {...tile} />
          ))}
        </div>
      )}

      {panels.length > 0 && (
        <div
          className={`grid ${panels.length > 1 ? (panels.length > 2 ? "grid-cols-3" : "grid-cols-2") : "grid-cols-1"} gap-3`}
        >
          {panels.map((panel, i) => (
            <DetailPanel key={i} {...panel} />
          ))}
        </div>
      )}
    </div>
  </div>
);

const SectionHeading = ({ children }) => (
  <div className="mb-3 mt-8 first:mt-0 flex items-center gap-3">
    <span className="h-5 w-1 rounded-full bg-slate-800" />
    <h2 className="text-[14px] font-bold tracking-wide text-slate-700">
      {children}
    </h2>
  </div>
);

const sectionMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 1, y: 0 },
};

/* -----------------------------------------------------------------
   Dashboard
------------------------------------------------------------------*/

const Dashboard = () => {
  const { fromDate: fyFromDate, toDate: fyToDate } = useFinancialYear();
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

  const loadDashboardData = useCallback(async () => {
    const { shouldFetch, from, to } = resolveApiDateRange(
      fromDate,
      toDate,
      fyFromDate,
      fyToDate,
    );

    if (!shouldFetch) {
      return;
    }

    setLoading(true);

    try {
      const dateQuery = from && to ? `?fromDate=${from}&toDate=${to}` : "";

      const adminParams = [
        "sort[0]=date:desc",
        "filters[approved][$eq]=true",
        "filters[current_status][$eq]=admin",
      ];
      if (from && to) {
        adminParams.push(`fromDate=${from}`, `toDate=${to}`);
      }
      const adminQuery = `?${adminParams.join("&")}`;

      const [
        gstSalesRes,
        gstExpenseRes,
        localExpenseRes,
        localSalesRes,
        adminExpenseRes,
        localAuthExpenseRes,
      ] = await Promise.allSettled([
        getGstSalesSummary(dateQuery),
        getGstExpenseSummary(dateQuery),
        getLocalExpenseAmounts(dateQuery),
        getLocalAmounts(dateQuery),
        getAdminExpenseAmounts(adminQuery),
        getLocalAuthenticatedExpenseAmounts(dateQuery),
      ]);

      setGstSalesSummary(
        gstSalesRes.status === "fulfilled" ? gstSalesRes.value : null,
      );
      setGstExpenseSummary(
        gstExpenseRes.status === "fulfilled" ? gstExpenseRes.value : null,
      );
      setLocalExpenseAmount(
        localExpenseRes.status === "fulfilled" ? localExpenseRes.value : [],
      );
      setLocalSalesAmount(
        localSalesRes.status === "fulfilled" ? localSalesRes.value : {},
      );
      setAdminExpenseAmount(
        adminExpenseRes.status === "fulfilled" ? adminExpenseRes.value : {},
      );
      setLocalAuthenticatedExpenseAmount(
        localAuthExpenseRes.status === "fulfilled"
          ? localAuthExpenseRes.value
          : [],
      );
    } catch (error) {
      console.error("Dashboard data load failed:", error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, fyFromDate, fyToDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <MainLayout>
      <div className="min-h-full bg-slate-50/50 pb-8">
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>

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
                      localAuthenticatedExpenseAmount?.production
                        ?.total_rec_cash,
                  },
                  {
                    label: "Hub",
                    value: localAuthenticatedExpenseAmount?.hub?.total_rec_cash,
                  },
                  {
                    label: "Admin",
                    value:
                      localAuthenticatedExpenseAmount?.admin?.total_rec_cash,
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
                      localAuthenticatedExpenseAmount?.production
                        ?.total_exp_cash,
                  },
                  {
                    label: "Hub",
                    value: localAuthenticatedExpenseAmount?.hub?.total_exp_cash,
                  },
                  {
                    label: "Admin",
                    value:
                      localAuthenticatedExpenseAmount?.admin?.total_exp_cash,
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
                      localAuthenticatedExpenseAmount?.expense?.total_rec_gpay,
                  },
                  {
                    label: "Approved",
                    value:
                      localAuthenticatedExpenseAmount?.approved?.total_rec_gpay,
                  },
                  {
                    label: "Production",
                    value:
                      localAuthenticatedExpenseAmount?.production
                        ?.total_rec_gpay,
                  },
                  {
                    label: "Hub",
                    value: localAuthenticatedExpenseAmount?.hub?.total_rec_gpay,
                  },
                  {
                    label: "Admin",
                    value:
                      localAuthenticatedExpenseAmount?.admin?.total_rec_gpay,
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
                      localAuthenticatedExpenseAmount?.production
                        ?.total_exp_gpay,
                  },
                  {
                    label: "Hub",
                    value: localAuthenticatedExpenseAmount?.hub?.total_exp_gpay,
                  },
                  {
                    label: "Admin",
                    value:
                      localAuthenticatedExpenseAmount?.admin?.total_exp_gpay,
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
                value:
                  gstSalesSummary?.total_tax - gstExpenseSummary?.total_tax,
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
                  localExpenseAmount?.total?.total_rec_account +
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
                  localExpenseAmount?.total?.total_exp_account +
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
                  localExpenseAmount?.total?.total_rec_account +
                  gstSalesSummary?.total_gpay +
                  gstSalesSummary?.total_account -
                  (localExpenseAmount?.total?.total_exp_cash +
                    localExpenseAmount?.total?.total_exp_gpay +
                    localExpenseAmount?.total?.total_exp_account +
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
                    tooltip: {
                      title: "Cash Breakdown",
                      sections: [
                        {
                          title: "Sales Receive",
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
                              value:
                                localSalesAmount?.local_pending?.total_cash,
                            },
                            {
                              label: "Party",
                              value: localSalesAmount?.local_party?.total_cash,
                            },
                            {
                              label: "GST",
                              value: gstSalesSummary?.total_cash,
                            },
                          ],
                        },
                        {
                          title: "Expense Receive",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_rec_cash,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_rec_cash,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production?.total_rec_cash,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_rec_cash,
                            },
                            {
                              label: "Admin",
                              value: localExpenseAmount?.admin?.total_rec_cash,
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    label: "GPay",
                    value:
                      localSalesAmount?.local_total?.total_gpay +
                      localExpenseAmount?.total?.total_rec_gpay +
                      gstSalesSummary?.total_gpay,
                    channel: "gpay",
                    tooltip: {
                      title: "GPay Breakdown",
                      sections: [
                        {
                          title: "Sales Receive",
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
                              value:
                                localSalesAmount?.local_pending?.total_gpay,
                            },
                            {
                              label: "Party",
                              value: localSalesAmount?.local_party?.total_gpay,
                            },
                            {
                              label: "GST",
                              value: gstSalesSummary?.total_gpay,
                            },
                          ],
                        },
                        {
                          title: "Expense Receive",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_rec_gpay,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_rec_gpay,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production?.total_rec_gpay,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_rec_gpay,
                            },
                            {
                              label: "Admin",
                              value: localExpenseAmount?.admin?.total_rec_gpay,
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    label: "Account",
                    value:
                      gstSalesSummary?.total_account +
                      localExpenseAmount?.total?.total_rec_account,
                    channel: "account",
                    tooltip: {
                      title: "Account Breakdown",
                      sections: [
                        {
                          title: "GST Sales",
                          items: [
                            {
                              label: "GST",
                              value: gstSalesSummary?.total_account,
                            },
                          ],
                        },
                        {
                          title: "Expense Receive",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_rec_account,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_rec_account,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production
                                  ?.total_rec_account,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_rec_account,
                            },
                            {
                              label: "Admin",
                              value:
                                localExpenseAmount?.admin?.total_rec_account,
                            },
                          ],
                        },
                      ],
                    },
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
                    tooltip: {
                      title: "Cash Expense Breakdown",
                      items: [
                        {
                          label: "Unapproved",
                          value: localExpenseAmount?.expense?.total_exp_cash,
                        },
                        {
                          label: "Approved",
                          value: localExpenseAmount?.approved?.total_exp_cash,
                        },
                        {
                          label: "Production",
                          value: localExpenseAmount?.production?.total_exp_cash,
                        },
                        {
                          label: "Hub",
                          value: localExpenseAmount?.hub?.total_exp_cash,
                        },
                        {
                          label: "Admin",
                          value: localExpenseAmount?.admin?.total_exp_cash,
                        },
                      ],
                    },
                  },
                  {
                    label: "GPay",
                    value: localExpenseAmount?.total?.total_exp_gpay,
                    channel: "gpay",
                    tooltip: {
                      title: "GPay Expense Breakdown",
                      items: [
                        {
                          label: "Unapproved",
                          value: localExpenseAmount?.expense?.total_exp_gpay,
                        },
                        {
                          label: "Approved",
                          value: localExpenseAmount?.approved?.total_exp_gpay,
                        },
                        {
                          label: "Production",
                          value: localExpenseAmount?.production?.total_exp_gpay,
                        },
                        {
                          label: "Hub",
                          value: localExpenseAmount?.hub?.total_exp_gpay,
                        },
                        {
                          label: "Admin",
                          value: localExpenseAmount?.admin?.total_exp_gpay,
                        },
                      ],
                    },
                  },
                  {
                    label: "Account",
                    value:
                      gstExpenseSummary?.total_account +
                      localExpenseAmount?.total?.total_exp_account,
                    channel: "account",
                    tooltip: {
                      title: "Account Expense Breakdown",
                      sections: [
                        {
                          title: "GST Expense",
                          items: [
                            {
                              label: "GST",
                              value: gstExpenseSummary?.total_account,
                            },
                          ],
                        },
                        {
                          title: "Local Expense",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_exp_account,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_exp_account,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production
                                  ?.total_exp_account,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_exp_account,
                            },
                            {
                              label: "Admin",
                              value:
                                localExpenseAmount?.admin?.total_exp_account,
                            },
                          ],
                        },
                      ],
                    },
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
                    tooltip: (
                      <BalanceTableTooltip
                        title="Cash Balance Breakdown"
                        rows={[
                          {
                            label: "Sales Unapproved",
                            rec:
                              Number(
                                localSalesAmount?.local_list?.total_cash,
                              ) || 0,
                            exp: 0,
                            highlight: true,
                          },
                          {
                            label: "Expense Unapproved",
                            rec:
                              Number(
                                localExpenseAmount?.expense?.total_rec_cash,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.expense?.total_exp_cash,
                              ) || 0,
                            highlight: true,
                          },
                          {
                            label: "Paid",
                            rec:
                              Number(
                                localSalesAmount?.local_paid?.total_cash,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Pending",
                            rec:
                              Number(
                                localSalesAmount?.local_pending?.total_cash,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Party",
                            rec:
                              Number(
                                localSalesAmount?.local_party?.total_cash,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Approved",
                            rec:
                              Number(
                                localExpenseAmount?.approved?.total_rec_cash,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.approved?.total_exp_cash,
                              ) || 0,
                          },
                          {
                            label: "Production",
                            rec:
                              Number(
                                localExpenseAmount?.production?.total_rec_cash,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.production?.total_exp_cash,
                              ) || 0,
                          },
                          {
                            label: "Hub",
                            rec:
                              Number(
                                localExpenseAmount?.hub?.total_rec_cash,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.hub?.total_exp_cash,
                              ) || 0,
                          },
                          {
                            label: "Admin",
                            rec:
                              Number(
                                localExpenseAmount?.admin?.total_rec_cash,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.admin?.total_exp_cash,
                              ) || 0,
                          },
                          {
                            label: "GST",
                            rec: Number(gstSalesSummary?.total_cash) || 0,
                            exp: Number(gstExpenseSummary?.total_cash) || 0,
                          },
                        ]}
                        totalRec={
                          localSalesAmount?.local_total?.total_cash +
                          localExpenseAmount?.total?.total_rec_cash +
                          gstSalesSummary?.total_cash
                        }
                        totalExp={localExpenseAmount?.total?.total_exp_cash}
                        totalBal={
                          localSalesAmount?.local_total?.total_cash +
                          localExpenseAmount?.total?.total_rec_cash +
                          gstSalesSummary?.total_cash -
                          localExpenseAmount?.total?.total_exp_cash
                        }
                      />
                    ),
                  },
                  {
                    label: "GPay",
                    value:
                      localSalesAmount?.local_total?.total_gpay +
                      localExpenseAmount?.total?.total_rec_gpay +
                      gstSalesSummary?.total_gpay -
                      localExpenseAmount?.total?.total_exp_gpay,
                    channel: "gpay",
                    tooltip: (
                      <BalanceTableTooltip
                        title="GPay Balance Breakdown"
                        rows={[
                          {
                            label: "Sales Unapproved",
                            rec:
                              Number(
                                localSalesAmount?.local_list?.total_gpay,
                              ) || 0,
                            exp: 0,
                            highlight: true,
                          },
                          {
                            label: "Expense Unapproved",
                            rec:
                              Number(
                                localExpenseAmount?.expense?.total_rec_gpay,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.expense?.total_exp_gpay,
                              ) || 0,
                            highlight: true,
                          },
                          {
                            label: "Paid",
                            rec:
                              Number(
                                localSalesAmount?.local_paid?.total_gpay,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Pending",
                            rec:
                              Number(
                                localSalesAmount?.local_pending?.total_gpay,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Party",
                            rec:
                              Number(
                                localSalesAmount?.local_party?.total_gpay,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Approved",
                            rec:
                              Number(
                                localExpenseAmount?.approved?.total_rec_gpay,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.approved?.total_exp_gpay,
                              ) || 0,
                          },
                          {
                            label: "Production",
                            rec:
                              Number(
                                localExpenseAmount?.production?.total_rec_gpay,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.production?.total_exp_gpay,
                              ) || 0,
                          },
                          {
                            label: "Hub",
                            rec:
                              Number(
                                localExpenseAmount?.hub?.total_rec_gpay,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.hub?.total_exp_gpay,
                              ) || 0,
                          },
                          {
                            label: "Admin",
                            rec:
                              Number(
                                localExpenseAmount?.admin?.total_rec_gpay,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.admin?.total_exp_gpay,
                              ) || 0,
                          },
                          {
                            label: "GST",
                            rec: Number(gstSalesSummary?.total_gpay) || 0,
                            exp: Number(gstExpenseSummary?.total_gpay) || 0,
                          },
                        ]}
                        totalRec={
                          localSalesAmount?.local_total?.total_gpay +
                          localExpenseAmount?.total?.total_rec_gpay +
                          gstSalesSummary?.total_gpay
                        }
                        totalExp={localExpenseAmount?.total?.total_exp_gpay}
                        totalBal={
                          localSalesAmount?.local_total?.total_gpay +
                          localExpenseAmount?.total?.total_rec_gpay +
                          gstSalesSummary?.total_gpay -
                          localExpenseAmount?.total?.total_exp_gpay
                        }
                      />
                    ),
                  },
                  {
                    label: "Account",
                    value:
                      gstSalesSummary?.total_account +
                      localExpenseAmount?.total?.total_rec_account -
                      (gstExpenseSummary?.total_account +
                        localExpenseAmount?.total?.total_exp_account),
                    channel: "account",
                    tooltip: (
                      <BalanceTableTooltip
                        title="Account Balance Breakdown"
                        rows={[
                          {
                            label: "Sales Unapproved",
                            rec:
                              Number(
                                localSalesAmount?.local_list?.total_account,
                              ) || 0,
                            exp: 0,
                            highlight: true,
                          },
                          {
                            label: "Expense Unapproved",
                            rec:
                              Number(
                                localExpenseAmount?.expense?.total_rec_account,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.expense?.total_exp_account,
                              ) || 0,
                            highlight: true,
                          },
                          {
                            label: "Paid",
                            rec:
                              Number(
                                localSalesAmount?.local_paid?.total_account,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Pending",
                            rec:
                              Number(
                                localSalesAmount?.local_pending?.total_account,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Party",
                            rec:
                              Number(
                                localSalesAmount?.local_party?.total_account,
                              ) || 0,
                            exp: 0,
                          },
                          {
                            label: "Approved",
                            rec:
                              Number(
                                localExpenseAmount?.approved?.total_rec_account,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.approved?.total_exp_account,
                              ) || 0,
                          },
                          {
                            label: "Production",
                            rec:
                              Number(
                                localExpenseAmount?.production
                                  ?.total_rec_account,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.production
                                  ?.total_exp_account,
                              ) || 0,
                          },
                          {
                            label: "Hub",
                            rec:
                              Number(
                                localExpenseAmount?.hub?.total_rec_account,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.hub?.total_exp_account,
                              ) || 0,
                          },
                          {
                            label: "Admin",
                            rec:
                              Number(
                                localExpenseAmount?.admin?.total_rec_account,
                              ) || 0,
                            exp:
                              Number(
                                localExpenseAmount?.admin?.total_exp_account,
                              ) || 0,
                          },
                          {
                            label: "GST",
                            rec: Number(gstSalesSummary?.total_account) || 0,
                            exp: Number(gstExpenseSummary?.total_account) || 0,
                          },
                        ]}
                        totalRec={
                          gstSalesSummary?.total_account +
                          localExpenseAmount?.total?.total_rec_account
                        }
                        totalExp={
                          gstExpenseSummary?.total_account +
                          localExpenseAmount?.total?.total_exp_account
                        }
                        totalBal={
                          gstSalesSummary?.total_account +
                          localExpenseAmount?.total?.total_rec_account -
                          (gstExpenseSummary?.total_account +
                            localExpenseAmount?.total?.total_exp_account)
                        }
                      />
                    ),
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
                  localExpenseAmount?.total?.total_rec_account +
                  localSalesAmount?.local_total?.total_balance +
                  gstSalesSummary?.total_balance,
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                title: "Total Expense",
                value:
                  localExpenseAmount?.total?.total_exp_cash +
                  localExpenseAmount?.total?.total_exp_gpay +
                  gstExpenseSummary?.total_account +
                  localExpenseAmount?.total?.total_exp_account +
                  gstExpenseSummary?.total_balance,
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
                  localExpenseAmount?.total?.total_rec_account +
                  localSalesAmount?.local_total?.total_balance +
                  gstSalesSummary?.total_balance -
                  (localExpenseAmount?.total?.total_exp_cash +
                    localExpenseAmount?.total?.total_exp_gpay +
                    gstExpenseSummary?.total_account +
                    localExpenseAmount?.total?.total_exp_account +
                    gstExpenseSummary?.total_balance),
                color: balanceColor(
                  localSalesAmount?.local_total?.total_cash +
                    localExpenseAmount?.total?.total_rec_cash +
                    gstSalesSummary?.total_cash +
                    localSalesAmount?.local_total?.total_gpay +
                    localExpenseAmount?.total?.total_rec_gpay +
                    gstSalesSummary?.total_gpay +
                    gstSalesSummary?.total_account +
                    localExpenseAmount?.total?.total_rec_account +
                    localSalesAmount?.local_total?.total_balance +
                    gstSalesSummary?.total_balance -
                    (localExpenseAmount?.total?.total_exp_cash +
                      localExpenseAmount?.total?.total_exp_gpay +
                      gstExpenseSummary?.total_account +
                      localExpenseAmount?.total?.total_exp_account +
                      gstExpenseSummary?.total_balance),
                ),
                bg: "bg-blue-50",
                tooltip: (
                  <BalanceTableTooltip
                    title="Finalize Balance Breakdown"
                    rows={[
                      {
                        label: "Sales Unapproved",
                        rec:
                          (Number(localSalesAmount?.local_list?.total_cash) || 0) +
                          (Number(localSalesAmount?.local_list?.total_gpay) || 0) +
                          (Number(localSalesAmount?.local_list?.total_balance) || 0),
                        exp: 0,
                        highlight: true,
                      },
                      {
                        label: "Expense Unapproved",
                        rec:
                          (Number(localExpenseAmount?.expense?.total_rec_cash) || 0) +
                          (Number(localExpenseAmount?.expense?.total_rec_gpay) || 0) +
                          (Number(localExpenseAmount?.expense?.total_rec_account) || 0),
                        exp:
                          (Number(localExpenseAmount?.expense?.total_exp_cash) || 0) +
                          (Number(localExpenseAmount?.expense?.total_exp_gpay) || 0) +
                          (Number(localExpenseAmount?.expense?.total_exp_account) || 0),
                        highlight: true,
                      },
                      {
                        label: "Paid",
                        rec:
                          (Number(localSalesAmount?.local_paid?.total_cash) || 0) +
                          (Number(localSalesAmount?.local_paid?.total_gpay) || 0) +
                          (Number(localSalesAmount?.local_paid?.total_balance) || 0),
                        exp: 0,
                      },
                      {
                        label: "Pending",
                        rec:
                          (Number(localSalesAmount?.local_pending?.total_cash) || 0) +
                          (Number(localSalesAmount?.local_pending?.total_gpay) || 0) +
                          (Number(localSalesAmount?.local_pending?.total_balance) || 0),
                        exp: 0,
                      },
                      {
                        label: "Party",
                        rec:
                          (Number(localSalesAmount?.local_party?.total_cash) || 0) +
                          (Number(localSalesAmount?.local_party?.total_gpay) || 0) +
                          (Number(localSalesAmount?.local_party?.total_balance) || 0),
                        exp: 0,
                      },
                      {
                        label: "Approved",
                        rec:
                          (Number(localExpenseAmount?.approved?.total_rec_cash) || 0) +
                          (Number(localExpenseAmount?.approved?.total_rec_gpay) || 0) +
                          (Number(localExpenseAmount?.approved?.total_rec_account) || 0),
                        exp:
                          (Number(localExpenseAmount?.approved?.total_exp_cash) || 0) +
                          (Number(localExpenseAmount?.approved?.total_exp_gpay) || 0) +
                          (Number(localExpenseAmount?.approved?.total_exp_account) || 0),
                      },
                      {
                        label: "Production",
                        rec:
                          (Number(localExpenseAmount?.production?.total_rec_cash) || 0) +
                          (Number(localExpenseAmount?.production?.total_rec_gpay) || 0) +
                          (Number(localExpenseAmount?.production?.total_rec_account) || 0),
                        exp:
                          (Number(localExpenseAmount?.production?.total_exp_cash) || 0) +
                          (Number(localExpenseAmount?.production?.total_exp_gpay) || 0) +
                          (Number(localExpenseAmount?.production?.total_exp_account) || 0),
                      },
                      {
                        label: "Hub",
                        rec:
                          (Number(localExpenseAmount?.hub?.total_rec_cash) || 0) +
                          (Number(localExpenseAmount?.hub?.total_rec_gpay) || 0) +
                          (Number(localExpenseAmount?.hub?.total_rec_account) || 0),
                        exp:
                          (Number(localExpenseAmount?.hub?.total_exp_cash) || 0) +
                          (Number(localExpenseAmount?.hub?.total_exp_gpay) || 0) +
                          (Number(localExpenseAmount?.hub?.total_exp_account) || 0),
                      },
                      {
                        label: "Admin",
                        rec:
                          (Number(localExpenseAmount?.admin?.total_rec_cash) || 0) +
                          (Number(localExpenseAmount?.admin?.total_rec_gpay) || 0) +
                          (Number(localExpenseAmount?.admin?.total_rec_account) || 0),
                        exp:
                          (Number(localExpenseAmount?.admin?.total_exp_cash) || 0) +
                          (Number(localExpenseAmount?.admin?.total_exp_gpay) || 0) +
                          (Number(localExpenseAmount?.admin?.total_exp_account) || 0),
                      },
                      {
                        label: "GST",
                        rec:
                          (Number(gstSalesSummary?.total_cash) || 0) +
                          (Number(gstSalesSummary?.total_gpay) || 0) +
                          (Number(gstSalesSummary?.total_account) || 0) +
                          (Number(gstSalesSummary?.total_balance) || 0),
                        exp:
                          (Number(gstExpenseSummary?.total_account) || 0) +
                          (Number(gstExpenseSummary?.total_balance) || 0),
                      },
                    ]}
                    totalRec={
                      localSalesAmount?.local_total?.total_cash +
                      localExpenseAmount?.total?.total_rec_cash +
                      gstSalesSummary?.total_cash +
                      localSalesAmount?.local_total?.total_gpay +
                      localExpenseAmount?.total?.total_rec_gpay +
                      gstSalesSummary?.total_gpay +
                      gstSalesSummary?.total_account +
                      localExpenseAmount?.total?.total_rec_account +
                      localSalesAmount?.local_total?.total_balance +
                      gstSalesSummary?.total_balance
                    }
                    totalExp={
                      localExpenseAmount?.total?.total_exp_cash +
                      localExpenseAmount?.total?.total_exp_gpay +
                      gstExpenseSummary?.total_account +
                      localExpenseAmount?.total?.total_exp_account +
                      gstExpenseSummary?.total_balance
                    }
                    totalBal={
                      localSalesAmount?.local_total?.total_cash +
                      localExpenseAmount?.total?.total_rec_cash +
                      gstSalesSummary?.total_cash +
                      localSalesAmount?.local_total?.total_gpay +
                      localExpenseAmount?.total?.total_rec_gpay +
                      gstSalesSummary?.total_gpay +
                      gstSalesSummary?.total_account +
                      localExpenseAmount?.total?.total_rec_account +
                      localSalesAmount?.local_total?.total_balance +
                      gstSalesSummary?.total_balance -
                      (localExpenseAmount?.total?.total_exp_cash +
                        localExpenseAmount?.total?.total_exp_gpay +
                        gstExpenseSummary?.total_account +
                        localExpenseAmount?.total?.total_exp_account +
                        gstExpenseSummary?.total_balance)
                    }
                  />
                ),
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
                    tooltip: {
                      title: "Cash Breakdown",
                      sections: [
                        {
                          title: "Sales Receive",
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
                              value:
                                localSalesAmount?.local_pending?.total_cash,
                            },
                            {
                              label: "Party",
                              value: localSalesAmount?.local_party?.total_cash,
                            },
                            {
                              label: "GST",
                              value: gstSalesSummary?.total_cash,
                            },
                          ],
                        },
                        {
                          title: "Expense Receive",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_rec_cash,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_rec_cash,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production?.total_rec_cash,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_rec_cash,
                            },
                            {
                              label: "Admin",
                              value: localExpenseAmount?.admin?.total_rec_cash,
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    label: "GPay",
                    value:
                      localSalesAmount?.local_total?.total_gpay +
                      localExpenseAmount?.total?.total_rec_gpay +
                      gstSalesSummary?.total_gpay,
                    channel: "gpay",
                    tooltip: {
                      title: "GPay Breakdown",
                      sections: [
                        {
                          title: "Sales Receive",
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
                              value:
                                localSalesAmount?.local_pending?.total_gpay,
                            },
                            {
                              label: "Party",
                              value: localSalesAmount?.local_party?.total_gpay,
                            },
                            {
                              label: "GST",
                              value: gstSalesSummary?.total_gpay,
                            },
                          ],
                        },
                        {
                          title: "Expense Receive",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_rec_gpay,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_rec_gpay,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production?.total_rec_gpay,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_rec_gpay,
                            },
                            {
                              label: "Admin",
                              value: localExpenseAmount?.admin?.total_rec_gpay,
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    label: "Account",
                    value:
                      gstSalesSummary?.total_account +
                      localExpenseAmount?.total?.total_rec_account,
                    channel: "account",
                    tooltip: {
                      title: "Account Breakdown",
                      sections: [
                        {
                          title: "GST Sales",
                          items: [
                            {
                              label: "GST",
                              value: gstSalesSummary?.total_account,
                            },
                          ],
                        },
                        {
                          title: "Expense Receive",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_rec_account,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_rec_account,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production
                                  ?.total_rec_account,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_rec_account,
                            },
                            {
                              label: "Admin",
                              value:
                                localExpenseAmount?.admin?.total_rec_account,
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    label: "Local Need to Get",
                    value: localSalesAmount?.local_total?.total_balance,
                    channel: "account",
                    tooltip: {
                      title: "Local Need to Get Breakdown",
                      items: [
                        {
                          label: "Unapproved",
                          value: localSalesAmount?.local_list?.total_balance,
                        },
                        {
                          label: "Paid",
                          value: localSalesAmount?.local_paid?.total_balance,
                        },
                        {
                          label: "Pending",
                          value: localSalesAmount?.local_pending?.total_balance,
                        },
                        {
                          label: "Party",
                          value: localSalesAmount?.local_party?.total_balance,
                        },
                      ],
                    },
                  },
                  {
                    label: "GST Need to Get",
                    value: gstSalesSummary?.total_balance,
                    channel: "account",
                    tooltip: {
                      title: "GST Need to Get Breakdown",
                      items: [
                        {
                          label: "Total Sales",
                          value: gstSalesSummary?.total_sales,
                        },
                        {
                          label: "Total Cash",
                          value: gstSalesSummary?.total_cash,
                        },
                        {
                          label: "Total GPay",
                          value: gstSalesSummary?.total_gpay,
                        },
                        {
                          label: "Total Account",
                          value: gstSalesSummary?.total_account,
                        },
                        {
                          label: "Balance",
                          value: gstSalesSummary?.total_balance,
                        },
                      ],
                    },
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
                    tooltip: {
                      title: "Cash Expense Breakdown",
                      items: [
                        {
                          label: "Unapproved",
                          value: localExpenseAmount?.expense?.total_exp_cash,
                        },
                        {
                          label: "Approved",
                          value: localExpenseAmount?.approved?.total_exp_cash,
                        },
                        {
                          label: "Production",
                          value: localExpenseAmount?.production?.total_exp_cash,
                        },
                        {
                          label: "Hub",
                          value: localExpenseAmount?.hub?.total_exp_cash,
                        },
                        {
                          label: "Admin",
                          value: localExpenseAmount?.admin?.total_exp_cash,
                        },
                      ],
                    },
                  },
                  {
                    label: "GPay",
                    value: localExpenseAmount?.total?.total_exp_gpay,
                    channel: "gpay",
                    tooltip: {
                      title: "GPay Expense Breakdown",
                      items: [
                        {
                          label: "Unapproved",
                          value: localExpenseAmount?.expense?.total_exp_gpay,
                        },
                        {
                          label: "Approved",
                          value: localExpenseAmount?.approved?.total_exp_gpay,
                        },
                        {
                          label: "Production",
                          value: localExpenseAmount?.production?.total_exp_gpay,
                        },
                        {
                          label: "Hub",
                          value: localExpenseAmount?.hub?.total_exp_gpay,
                        },
                        {
                          label: "Admin",
                          value: localExpenseAmount?.admin?.total_exp_gpay,
                        },
                      ],
                    },
                  },
                  {
                    label: "Account",
                    value:
                      gstExpenseSummary?.total_account +
                      localExpenseAmount?.total?.total_exp_account,
                    channel: "account",
                    tooltip: {
                      title: "Account Expense Breakdown",
                      sections: [
                        {
                          title: "GST Expense",
                          items: [
                            {
                              label: "GST",
                              value: gstExpenseSummary?.total_account,
                            },
                          ],
                        },
                        {
                          title: "Local Expense",
                          items: [
                            {
                              label: "Unapproved",
                              value:
                                localExpenseAmount?.expense?.total_exp_account,
                            },
                            {
                              label: "Approved",
                              value:
                                localExpenseAmount?.approved?.total_exp_account,
                            },
                            {
                              label: "Production",
                              value:
                                localExpenseAmount?.production
                                  ?.total_exp_account,
                            },
                            {
                              label: "Hub",
                              value: localExpenseAmount?.hub?.total_exp_account,
                            },
                            {
                              label: "Admin",
                              value:
                                localExpenseAmount?.admin?.total_exp_account,
                            },
                          ],
                        },
                      ],
                    },
                  },
                  {
                    label: "GST Need to Pay",
                    value: gstExpenseSummary?.total_balance,
                    channel: "account",
                    tooltip: {
                      title: "GST Need to Pay Breakdown",
                      items: [
                        {
                          label: "Total Expense",
                          value: gstExpenseSummary?.total_expense,
                        },
                        {
                          label: "Total Cash",
                          value: gstExpenseSummary?.total_cash,
                        },
                        {
                          label: "Total GPay",
                          value: gstExpenseSummary?.total_gpay,
                        },
                        {
                          label: "Total Account",
                          value: gstExpenseSummary?.total_account,
                        },
                        {
                          label: "Balance",
                          value: gstExpenseSummary?.total_balance,
                        },
                      ],
                    },
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
                  (localExpenseAmount?.local_expense_total +
                    gstExpenseSummary?.total_expense),
                color: balanceColor(
                  localSalesAmount?.sales_total +
                    gstSalesSummary?.total_sales -
                    (localExpenseAmount?.local_expense_total +
                      gstExpenseSummary?.total_expense),
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
                  // {
                  //   label: "Admin Receive",
                  //   value:
                  //     localExpenseAmount?.admin?.total_rec_cash +
                  //     localExpenseAmount?.admin?.total_rec_gpay +
                  //     localExpenseAmount?.admin?.total_rec_account,
                  // },
                  // {
                  //   label: "Expense Receive",
                  //   value: localExpenseAmount?.local_receive_total,
                  // },
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
                  // {
                  //   label: "Admin Expense",
                  //   value:
                  //     localExpenseAmount?.admin?.total_exp_cash +
                  //     localExpenseAmount?.admin?.total_exp_gpay +
                  //     localExpenseAmount?.admin?.total_exp_account,
                  // },
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
      </div>
    </MainLayout>
  );
};

export default Dashboard;
