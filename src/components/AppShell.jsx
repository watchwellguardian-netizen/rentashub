import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Search, CalendarCheck, MessageSquare, Bot, LayoutDashboard, Wallet, Bell, BadgeCheck, Home, Gavel, ClipboardCheck, Truck, Landmark, BarChart3, BookOpen, ListChecks, Activity, LifeBuoy } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import { messageAdapter } from "../lib/adapters/messageAdapter.js";
import { notificationAdapter } from "../lib/adapters/notificationAdapter.js";
import { roleLabel } from "../lib/rbac.js";
import { APP_NAME } from "../lib/brand.js";
import Button from "./Button.jsx";
import BrandLogo from "./BrandLogo.jsx";

const navItems = [
  { to: "/landing", label: "Landing", icon: Home },
  { to: "/customer-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/search", label: "Search", icon: Search },
  { to: "/auctions", label: "Auctions", icon: Gavel },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/trust", label: "Trust", icon: BadgeCheck },
  { to: "/ai-assistant", label: "AI Help", icon: Bot },
  { to: "/documentation", label: "Docs", icon: BookOpen },
  { to: "/workflows", label: "Workflows", icon: ListChecks },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSupplier = ["supplier", "vendor"].includes(user?.role);
  const isAdmin = user?.role === "admin";
  const isBroker = user?.role === "broker";
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return () => {
        active = false;
      };
    }
    Promise.all([
      Promise.resolve(messageAdapter.listVisibleThreads(window.localStorage, user, { user })),
      Promise.resolve(notificationAdapter.listByUser(window.localStorage, user.id, { user })),
    ])
      .then(([threads, notifications]) => {
        if (!active) return;
        setUnreadMessages(threads.reduce((total, thread) => total + Number(thread.unreadBy?.[user.id] || 0), 0));
        setUnreadNotifications(notifications.filter((notification) => !notification.read).length);
      })
      .catch(() => {
        if (!active) return;
        setUnreadMessages(0);
        setUnreadNotifications(0);
      });
    return () => {
      active = false;
    };
  }, [user]);
  const visibleNavItems = isAdmin
    ? [
        { to: "/landing", label: "Landing", icon: Home },
        { to: "/admin", label: "Admin", icon: LayoutDashboard },
        { to: "/admin/auctions", label: "Auctions", icon: Gavel },
        { to: "/admin/users", label: "Users", icon: BadgeCheck },
        { to: "/admin/listings", label: "Listings", icon: Search },
        { to: "/admin/verifications", label: "Verify", icon: Bell },
        { to: "/admin/risk", label: "Risk", icon: BadgeCheck },
        { to: "/admin/support", label: "Support", icon: LifeBuoy },
        { to: "/admin/inspectors", label: "Inspectors", icon: ClipboardCheck },
        { to: "/admin/transport", label: "Transport", icon: Truck },
        { to: "/admin/financing", label: "Financing", icon: Landmark },
        { to: "/admin/auction-analytics", label: "Analytics", icon: BarChart3 },
        { to: "/admin/auction-documents", label: "Documents", icon: ClipboardCheck },
        { to: "/admin/ai-listing-recommendations", label: "AI Recs", icon: Bot },
        { to: "/admin/ai-valuations", label: "Valuations", icon: BarChart3 },
        { to: "/admin/system-status", label: "Status", icon: Activity },
        { to: "/documentation", label: "Docs", icon: BookOpen },
        { to: "/admin/notifications", label: "Alerts", icon: Bell },
      ]
    : isBroker
    ? [
        { to: "/landing", label: "Landing", icon: Home },
        { to: "/brokerage/leads", label: "Broker Leads", icon: LayoutDashboard },
        { to: "/dealer/auction-dashboard", label: "Auctions", icon: Gavel },
        { to: "/dealer/auction-analytics", label: "Analytics", icon: BarChart3 },
        { to: "/brokerage", label: "Brokerage", icon: Search },
        { to: "/marketplace", label: "Marketplace", icon: Search },
        { to: "/trust", label: "Trust", icon: BadgeCheck },
        { to: "/documentation", label: "Docs", icon: BookOpen },
        { to: "/workflows", label: "Workflows", icon: ListChecks },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/support", label: "Support", icon: LifeBuoy },
        { to: "/dealer/notifications", label: "Alerts", icon: Bell },
      ]
    : isSupplier
    ? [
        { to: "/landing", label: "Landing", icon: Home },
        { to: "/supplier-dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/supplier/auctions", label: "Auctions", icon: Gavel },
        { to: "/supplier/auction-analytics", label: "Analytics", icon: BarChart3 },
        { to: "/supplier/auction-documents", label: "Documents", icon: ClipboardCheck },
        { to: "/inspectors/dashboard", label: "Inspections", icon: ClipboardCheck },
        { to: "/transport/dashboard", label: "Transport", icon: Truck },
        { to: "/financing/dashboard", label: "Financing", icon: Landmark },
        { to: "/my-listings", label: "Listings", icon: Search },
        { to: "/rental-requests", label: "Requests", icon: CalendarCheck },
        { to: "/earnings", label: "Earnings", icon: Wallet },
        { to: "/supplier-profile", label: "Profile", icon: BadgeCheck },
        { to: "/trust", label: "Trust", icon: BadgeCheck },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/support", label: "Support", icon: LifeBuoy },
        { to: "/supplier/notifications", label: "Alerts", icon: Bell },
        { to: "/ai-assistant", label: "AI Help", icon: Bot },
        { to: "/documentation", label: "Docs", icon: BookOpen },
        { to: "/workflows", label: "Workflows", icon: ListChecks },
      ]
  : navItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <BrandLogo />
        </div>
        <div className="user-strip">
          <span>{user?.full_name}</span>
          <span>{roleLabel(user?.role)}</span>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>
      <nav className="navrail" aria-label={`${APP_NAME} navigation`}>
        {visibleNavItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>
            <item.icon size={18} aria-hidden="true" />
            {item.label}
            {item.to === "/messages" && unreadMessages ? <span className="nav-count">{unreadMessages}</span> : null}
            {item.to.includes("notifications") && unreadNotifications ? <span className="nav-count">{unreadNotifications}</span> : null}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
