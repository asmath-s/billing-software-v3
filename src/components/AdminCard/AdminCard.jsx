import { AccountIcon, CashIcon, GpayIcon } from "../icons";

const formatAmount = (amount = 0) =>
  new Intl.NumberFormat("en-IN").format(amount);

const Item = ({ label, value, color, icon }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
    <span className="text-gray-600 flex items-center gap-2">
      {icon} {label}
    </span>
    <span className={`font-semibold ${color}`}>₹ {formatAmount(value)}</span>
  </div>
);

const Summary = ({ title, value, color, bg }) => (
  <div className={`${bg} rounded-xl p-4`}>
    <p className="text-sm text-gray-600">{title}</p>
    <h3 className={`text-2xl font-bold mt-1 ${color}`}>
      ₹ {formatAmount(value)}
    </h3>
  </div>
);

const AdminCard = ({
  title,
  titleColor,

  receivedAmount,
  expenseAmount,
  balanceAmount,

  getCash,
  getGpay,
  getAccount,

  giveCash,
  giveGpay,
  giveAccount,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6">
      {/* Header */}

      <h2 className={`text-2xl font-bold ${titleColor} mb-3`}>{title}</h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Summary
          title="Give To Office"
          value={receivedAmount}
          color="text-green-600"
          bg="bg-green-50"
        />

        <Summary
          title="Get From Office"
          value={expenseAmount}
          color="text-red-600"
          bg="bg-red-50"
        />

        <Summary
          title="Total Taken Amount"
          value={balanceAmount}
          color={balanceAmount >= 0 ? "text-blue-600" : "text-orange-600"}
          bg="bg-blue-50"
        />
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Received */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h3 className="font-semibold text-green-700 mb-3">Received</h3>

          <Item
            label="Cash"
            value={getCash}
            color="text-gray-800"
            icon={<CashIcon color="#292D32" width="22" height="22" />}
          />

          <Item
            label="GPay"
            value={getGpay}
            color="text-gray-800"
            icon={<GpayIcon color="#292D32" width="22" height="22" />}
          />

          <Item
            label="Account"
            value={getAccount}
            color="text-gray-800"
            icon={<AccountIcon color="#292D32" width="22" height="22" />}
          />
        </div>

        {/* Expense */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <h3 className="font-semibold text-red-700 mb-3">Expense</h3>

          <Item
            label="Cash"
            value={giveCash}
            color="text-gray-800"
            icon={<CashIcon color="#292D32" width="22" height="22" />}
          />

          <Item
            label="GPay"
            value={giveGpay}
            color="text-gray-800"
            icon={<GpayIcon color="#292D32" width="22" height="22" />}
          />

          <Item
            label="Account"
            value={giveAccount}
            color="text-gray-800"
            icon={<AccountIcon color="#292D32" width="22" height="22" />}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminCard;
