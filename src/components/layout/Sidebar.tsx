"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Bell,
  Users,
  Package,
  FileText,
  LogOut,
  Leaf,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "แชท", icon: MessageSquare, badge: true },
  { href: "/alerts", label: "การแจ้งเตือน", icon: Bell },
  { href: "/templates", label: "เทมเพลตคำตอบ", icon: FileText },
  { href: "/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/products", label: "สินค้า", icon: Package },
];

interface SidebarProps {
  handoffCount?: number;
}

export default function Sidebar({ handoffCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } h-screen bg-primary-800 text-white flex flex-col transition-all duration-300 fixed left-0 top-0 z-40`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-700">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shrink-0">
          <Leaf className="w-6 h-6" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-lg leading-tight">น้องลัดดา</h1>
            <p className="text-primary-300 text-xs">Admin Panel</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-primary-400 hover:text-white transition"
        >
          <ChevronLeft className={`w-5 h-5 transition ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                isActive
                  ? "bg-primary-500 text-white"
                  : "text-primary-300 hover:bg-primary-700 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {item.badge && handoffCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {handoffCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-400 hover:bg-primary-700 hover:text-white transition"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">ออกจากระบบ</span>}
        </Link>
      </div>
    </aside>
  );
}
