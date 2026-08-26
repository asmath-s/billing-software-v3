import { formattedAmount } from "../../utils/FormatAmount";

const CardUI = ({
  title,
  amount,
  icon,
  titleColor = "",
  className = "",
  amountColor = "",
}) => {
  return (
    <div
      className={`flex gap-16 items-start justify-between border border-[#9e77d2] rounded-lg p-4 w-100 ${className}`}
    >
      <div>
        <p className={`text-lg font-normal mb-2 ${titleColor}`}>{title}</p>
        <h2 className={`text-[26px] font-normal ${amountColor}`}>
          ₹ {formattedAmount(amount)}
        </h2>
      </div>
      {icon}
    </div>
  );
};

export default CardUI;

