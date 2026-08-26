import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../../assets/rayyanflexlogo.png";
import { appConfig } from "../../config/appConfig";
import { useAuth } from "../../context/auth-context";
import { useFinancialYear } from "../../context/financial-year-context";
import {
  ArrowDownIcon,
  CalendarIcon,
  HamburgerIcon,
  LogoutIcon,
} from "../icons";

const MenuItem = ({ icon: Icon, label, path, collapsed, isActive }) => {
  return (
    <Link
      to={path}
      className={`flex items-center gap-4 px-3 py-2 rounded-full text-white text-lg font-medium transition-all duration-200
      ${collapsed ? "justify-center" : ""}
      ${isActive ? "bg-[#9E77D2]" : "hover:bg-[#9E77D2]"}`}
    >
      {Icon && <Icon />}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
};

const SubMenu = ({ menu, collapsed, isOpen, onToggle, isPathActive }) => {
  const Icon = menu.icon;

  return (
    <>
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={() => onToggle(menu.key)}
      >
        <div className="flex items-center gap-4 text-white text-lg font-medium">
          {Icon && <Icon />}
          {!collapsed && <span>{menu.label}</span>}
        </div>
        {!collapsed && (
          <ArrowDownIcon className={isOpen ? "rotate-180" : ""} />
        )}
      </div>

      {isOpen && (
        <div className={`flex flex-col gap-1 ${collapsed ? "" : "ml-6"}`}>
          {menu.children.map((child) => (
            <MenuItem
              key={child.path}
              {...child}
              collapsed={collapsed}
              isActive={isPathActive(child.path)}
            />
          ))}
        </div>
      )}
    </>
  );
};

const Sidebar = () => {
  const { pathname } = useLocation();
  const { role, logout } = useAuth();
  const {
    financialYear,
    availableYears,
    setFinancialYear,
    shortLabel,
    displayRange,
  } = useFinancialYear();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const isActive = (path) => pathname.startsWith(path);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  const filteredMenu = useMemo(() => {
    return appConfig
      .filter((item) => item.roles.includes(role))
      .map((item) => {
        if (item.type === "submenu") {
          return {
            ...item,
            children: item.children.filter((child) =>
              child.roles.includes(role),
            ),
          };
        }
        return item;
      });
  }, [role]);

  useEffect(() => {
    filteredMenu.forEach((menu) => {
      if (menu.type === "submenu") {
        const isChildActive = menu.children.some((child) =>
          pathname.startsWith(child.path),
        );
        if (isChildActive) setOpenMenu(menu.key);
      }
    });
  }, [pathname, filteredMenu]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div
      className={`h-[98vh] p-5 bg-[#24252B] m-2 rounded-xl transition-all duration-300 flex flex-col justify-between ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Top Section: Logo, Financial Year Picker & Nav Links */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center">
          {!collapsed && <img src={Logo} width={120} alt="Logo" />}
          <div
            className="cursor-pointer"
            onClick={() => setCollapsed(!collapsed)}
          >
            <HamburgerIcon />
          </div>
        </div>

        {/* ================= COMPACT FINANCIAL YEAR DROPDOWN PICKER AT TOP OF SIDEBAR ================= */}
        {!collapsed ? (
          <div className="mt-4 mb-2">
            <div className="relative flex items-center bg-[#1D1E23] border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner transition hover:border-[#9E77D2] focus-within:border-[#9E77D2] focus-within:ring-1 focus-within:ring-[#9E77D2]">
              <div className="flex items-center gap-1.5 text-[#9E77D2] mr-2 shrink-0">
                <CalendarIcon width="15" height="15" color="#9E77D2" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 leading-tight">
                  Financial Year
                </div>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(Number(e.target.value))}
                  title={`Date Range: ${displayRange}`}
                  className="w-full bg-transparent text-xs font-bold text-white outline-none cursor-pointer appearance-none"
                >
                  {availableYears.map((fy) => {
                    const fyLabel = `${fy}–${String(fy + 1).slice(-2)}`;
                    return (
                      <option
                        key={fy}
                        value={fy}
                        className="bg-[#24252B] text-white py-1"
                      >
                        FY {fyLabel}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="pointer-events-none text-slate-400 ml-1">
                <ArrowDownIcon className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 mb-2 flex justify-center">
            <div className="relative group">
              <div
                title={`Financial Year: ${shortLabel} (${displayRange})`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D1E23] border border-slate-700/80 text-[#9E77D2] cursor-pointer hover:border-[#9E77D2] transition"
              >
                <CalendarIcon width="16" height="16" color="#9E77D2" />
              </div>
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(Number(e.target.value))}
                title={`Financial Year: ${shortLabel}`}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                {availableYears.map((fy) => {
                  const fyLabel = `${fy}–${String(fy + 1).slice(-2)}`;
                  return (
                    <option key={fy} value={fy} className="bg-[#24252B] text-white">
                      FY {fyLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Menu */}
        <div className="mt-3 flex flex-col gap-1 overflow-y-auto pr-1">
          {filteredMenu.map((menu) =>
            menu.type === "link" ? (
              <MenuItem
                key={menu.path}
                {...menu}
                collapsed={collapsed}
                isActive={isActive(menu.path)}
              />
            ) : (
              <SubMenu
                key={menu.key}
                menu={menu}
                collapsed={collapsed}
                isOpen={openMenu === menu.key}
                onToggle={toggleMenu}
                isPathActive={isActive}
              />
            ),
          )}
        </div>
      </div>

      {/* Bottom Section: Logout */}
      <div className="pt-2 shrink-0">
        <button
          className={`${
            collapsed ? "w-[50px] justify-center" : "w-full"
          } bg-[#2D2D35] text-white text-lg py-3 px-4 rounded-full flex items-center gap-2 hover:bg-[#9E77D2] focus:bg-[#9E77D2] transition`}
          onClick={handleLogout}
        >
          <LogoutIcon /> {!collapsed && "Logout"}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
