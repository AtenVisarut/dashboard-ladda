"use client";

import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { Users, MessageSquare, Clock, AlertTriangle, Smartphone, Package, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface DailySeries {
  date: string;
  requests: number;
  users: number;
  avgResponse: number;
  errors: number;
}

interface Stats {
  totalUsers: number;
  lineUsers: number;
  fbUsers: number;
  totalQuestions: number;
  totalErrors: number;
  avgResponseTime: number;
  totalProducts: number;
  topQuestions: Array<{ question: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  recentEvents: Array<{ event_type: string; question_text: string; response_time_ms: number; created_at: string }>;
  dailySeries: DailySeries[];
}

function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function HealthBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    healthy: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "ปกติ" },
    degraded: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", label: "ช้า" },
    unhealthy: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "มีปัญหา" },
  };
  const c = config[status] || config.healthy;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />
      {c.label}
    </span>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState("healthy");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceISO = since.toISOString();

      // Parallel queries
      const [usersRes, eventsRes, productsRes, errorsRes] = await Promise.all([
        supabase.from("user_ladda(LINE,FACE)").select("line_user_id, display_name, created_at"),
        supabase.from("ladda_analyst_event").select("event_type, question_text, intent, response_time_ms, created_at").gte("created_at", sinceISO).order("created_at", { ascending: false }).limit(500),
        supabase.from("products3").select("id", { count: "exact", head: true }),
        supabase.from("ladda_analyst_event").select("id", { count: "exact", head: true }).eq("event_type", "error").gte("created_at", sinceISO),
      ]);

      const users = usersRes.data || [];
      const events = eventsRes.data || [];
      const totalProducts = productsRes.count || 0;
      const totalErrors = errorsRes.count || 0;

      const lineUsers = users.filter(u => u.line_user_id && !u.line_user_id.startsWith("fb:")).length;
      const fbUsers = users.filter(u => u.line_user_id && u.line_user_id.startsWith("fb:")).length;

      const questions = events.filter(e => e.event_type === "question");
      const responseTimes = questions.map(e => e.response_time_ms).filter(Boolean);
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      // Top questions
      const qCounts: Record<string, number> = {};
      questions.forEach(e => {
        const q = (e.question_text || "").substring(0, 60);
        if (q) qCounts[q] = (qCounts[q] || 0) + 1;
      });
      const topQuestions = Object.entries(qCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([question, count]) => ({ question, count }));

      // Top intents
      const iCounts: Record<string, number> = {};
      questions.forEach(e => {
        const i = e.intent || "unknown";
        iCounts[i] = (iCounts[i] || 0) + 1;
      });
      const topIntents = Object.entries(iCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([intent, count]) => ({ intent, count }));

      // Daily series
      const dailyMap: Record<string, { requests: number; users: Set<string>; responseTimes: number[]; errors: number }> = {};
      events.forEach(e => {
        const day = e.created_at.substring(0, 10);
        if (!dailyMap[day]) dailyMap[day] = { requests: 0, users: new Set(), responseTimes: [], errors: 0 };
        dailyMap[day].requests++;
        if (e.event_type === "error") dailyMap[day].errors++;
        if (e.response_time_ms) dailyMap[day].responseTimes.push(e.response_time_ms);
      });
      const dailySeries: DailySeries[] = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, d]) => ({
          date: date.substring(5),
          requests: d.requests,
          users: d.users.size,
          avgResponse: d.responseTimes.length > 0 ? Math.round(d.responseTimes.reduce((a, b) => a + b, 0) / d.responseTimes.length / 1000 * 10) / 10 : 0,
          errors: d.errors,
        }));

      // Health
      const errorRate = questions.length > 0 ? totalErrors / questions.length : 0;
      const avgMs = avgResponseTime;
      let healthStatus = "healthy";
      if (errorRate > 0.2 || avgMs > 15000) healthStatus = "unhealthy";
      else if (errorRate > 0.1 || avgMs > 10000) healthStatus = "degraded";

      setStats({
        totalUsers: users.length,
        lineUsers,
        fbUsers,
        totalQuestions: questions.length,
        totalErrors,
        avgResponseTime,
        totalProducts,
        topQuestions,
        topIntents,
        recentEvents: events.slice(0, 20),
        dailySeries,
      });
      setHealth(healthStatus);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <>
      <Header title="Dashboard" subtitle="ภาพรวมระบบ Chatbot น้องลัดดา" />

      <div className="p-6 space-y-6">
        {/* Period Selector + Health */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  days === d
                    ? "bg-primary-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {d === 1 ? "วันนี้" : `${d} วัน`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchStats} disabled={loading} className="p-2 hover:bg-gray-100 rounded-xl transition">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
            <span className="text-sm text-gray-500">สถานะ:</span>
            <HealthBadge status={health} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Users} label="ผู้ใช้งาน" value={stats?.totalUsers ?? "-"} subtext="ทั้งหมด" color="bg-primary-500" />
          <StatCard icon={MessageSquare} label="คำถาม" value={stats?.totalQuestions ?? "-"} subtext={`${days === 1 ? "วันนี้" : `${days} วัน`}`} color="bg-[#28A745]" />
          <StatCard icon={Clock} label="ตอบเฉลี่ย" value={stats ? `${(stats.avgResponseTime / 1000).toFixed(1)}s` : "-"} subtext="avg response time" color="bg-[#FFA000]" />
          <StatCard icon={AlertTriangle} label="Errors" value={stats?.totalErrors ?? "-"} subtext={stats && stats.totalQuestions > 0 ? `${((stats.totalErrors / stats.totalQuestions) * 100).toFixed(1)}%` : ""} color="bg-[#DC3545]" />
          <StatCard icon={Package} label="สินค้า" value={stats?.totalProducts ?? "-"} subtext="products" color="bg-primary-700" />
        </div>

        {/* Daily Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Requests / วัน</h3>
            <div className="h-64">
              {stats?.dailySeries && stats.dailySeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="requests" stroke="#004F9F" fill="#004F9F" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">ยังไม่มีข้อมูล</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Response Time เฉลี่ย (วินาที)</h3>
            <div className="h-64">
              {stats?.dailySeries && stats.dailySeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="avgResponse" fill="#FFA000" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-16">ยังไม่มีข้อมูล</p>
              )}
            </div>
          </div>
        </div>

        {/* Platform Breakdown + System */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">แพลตฟอร์ม</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#06C755] rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">LINE</span>
                    <span className="text-sm text-gray-500">{stats?.lineUsers ?? 0} users</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#06C755] h-2 rounded-full transition-all" style={{ width: stats ? `${(stats.lineUsers / Math.max(stats.totalUsers, 1)) * 100}%` : "0%" }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#0084FF] rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Facebook</span>
                    <span className="text-sm text-gray-500">{stats?.fbUsers ?? 0} users</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#0084FF] h-2 rounded-full transition-all" style={{ width: stats ? `${(stats.fbUsers / Math.max(stats.totalUsers, 1)) * 100}%` : "0%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Intents */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">หัวข้อที่ถามบ่อย</h3>
            <div className="space-y-2">
              {(stats?.topIntents || []).map((item, i) => {
                const intentLabels: Record<string, { label: string; emoji: string }> = {
                  product_inquiry: { label: "ถามข้อมูลสินค้า", emoji: "💊" },
                  product_recommendation: { label: "ขอแนะนำสินค้า", emoji: "🛒" },
                  disease_treatment: { label: "โรคพืช", emoji: "🦠" },
                  pest_control: { label: "แมลงศัตรูพืช", emoji: "🐛" },
                  weed_control: { label: "วัชพืช", emoji: "🌿" },
                  nutrient_supplement: { label: "บำรุง/ฮอร์โมน", emoji: "🌱" },
                  usage_instruction: { label: "วิธีใช้/อัตราผสม", emoji: "📋" },
                  general_agriculture: { label: "เกษตรทั่วไป", emoji: "🌾" },
                  greeting: { label: "ทักทาย", emoji: "👋" },
                  unknown: { label: "อื่นๆ", emoji: "❓" },
                };
                const mapped = intentLabels[item.intent] || { label: item.intent, emoji: "📌" };
                return (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-primary-50 text-primary-500 rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="text-sm text-gray-700">{mapped.emoji} {mapped.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">{item.count}</span>
                </div>
                );
              })}
              {(!stats?.topIntents || stats.topIntents.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูล</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Questions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">คำถามยอดนิยม</h3>
          <div className="space-y-2">
            {(stats?.topQuestions || []).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-primary-50 text-primary-500 rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-sm text-gray-700">{item.question}</span>
                </div>
                <span className="text-sm font-medium text-gray-500">{item.count} ครั้ง</span>
              </div>
            ))}
            {(!stats?.topQuestions || stats.topQuestions.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Events ล่าสุด</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">ประเภท</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">คำถาม</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Response</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentEvents || []).map((e, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.event_type === "error" ? "bg-red-100 text-red-700" :
                        e.event_type === "question" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{e.event_type}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-700 max-w-xs truncate">{e.question_text || "-"}</td>
                    <td className="py-2 px-3 text-right text-gray-500">{e.response_time_ms ? `${(e.response_time_ms / 1000).toFixed(1)}s` : "-"}</td>
                    <td className="py-2 px-3 text-right text-gray-400 text-xs">{new Date(e.created_at).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats?.recentEvents || stats.recentEvents.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มี events</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
