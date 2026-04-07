"use client";

import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Info, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface Alert {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  created_at: string;
}

const severityConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string }> = {
  critical: { icon: AlertCircle, bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  warning: { icon: AlertTriangle, bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  info: { icon: Info, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("analytics_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq("severity", filter);
      }

      const { data } = await query;
      setAlerts(data || []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const grouped = {
    critical: alerts.filter(a => a.severity === "critical"),
    warning: alerts.filter(a => a.severity === "warning"),
    info: alerts.filter(a => a.severity === "info"),
  };

  return (
    <>
      <Header title="การแจ้งเตือน" subtitle="Alerts จากระบบ" alertCount={grouped.critical.length} />

      <div className="p-6 space-y-6">
        {/* Filter + Stats */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[
              { key: "all", label: "ทั้งหมด", count: alerts.length },
              { key: "critical", label: "วิกฤต", count: grouped.critical.length },
              { key: "warning", label: "เตือน", count: grouped.warning.length },
              { key: "info", label: "ทั่วไป", count: grouped.info.length },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === f.key
                    ? "bg-primary-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          <button onClick={fetchAlerts} disabled={loading} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700">{grouped.critical.length}</p>
                <p className="text-sm text-red-500">วิกฤต</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">{grouped.warning.length}</p>
                <p className="text-sm text-yellow-500">เตือน</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Info className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{grouped.info.length}</p>
                <p className="text-sm text-blue-500">ทั่วไป</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={alert.id} className={`${config.bg} border ${config.border} rounded-2xl p-4 flex items-start gap-4`}>
                <Icon className={`w-5 h-5 ${config.text} mt-0.5 shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${config.text}`}>{alert.alert_type}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(alert.created_at).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                </div>
              </div>
            );
          })}

          {!loading && alerts.length === 0 && (
            <div className="text-center py-16">
              <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">ไม่มีการแจ้งเตือน</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
