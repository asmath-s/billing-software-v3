import Sidebar from "../components/Sidebar/Sidebar";
import { ToastContainer } from "react-toastify";

const MainLayout = ({ children }) => {
  return (
    <div className="flex gap-4 h-screen overflow-hidden">
      <div>
        <Sidebar />
      </div>
      <div className="w-full pt-10 pr-5 overflow-y-scroll overflow-x-hidden">
        {children}
      </div>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={true}
        closeOnClick={false}
        theme="colored"
      />
    </div>
  );
};

export default MainLayout;
