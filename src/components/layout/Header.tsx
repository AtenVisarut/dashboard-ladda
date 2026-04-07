"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  alertCount?: number;
}

export default function Header({ title, subtitle, alertCount = 0 }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center bg-gray-100 rounded-xl px-3 py-2 gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหา..."
            className="bg-transparent outline-none text-sm w-40"
          />
        </div>

        {/* Alerts */}
        <button className="relative p-2 hover:bg-gray-100 rounded-xl transition">
          <Bell className="w-5 h-5 text-gray-600" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {alertCount}
            </span>
          )}
        </button>

        {/* Admin avatar */}
        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
          A
        </div>
      </div>
    </header>
  );
}
