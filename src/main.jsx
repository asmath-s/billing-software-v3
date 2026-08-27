import ReactDOM from "react-dom/client";
import App from "./App";
import AuthProvider from "./context/AuthProvider";
import FinancialYearProvider from "./context/FinancialYearProvider";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <FinancialYearProvider>
      <App />
    </FinancialYearProvider>
  </AuthProvider>,
);
