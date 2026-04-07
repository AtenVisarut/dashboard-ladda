"use client";

import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { Search, RefreshCw, MessageSquare, ExternalLink, Smartphone } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface User {
  id: number;
  line_user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  platform: "LINE" | "Facebook";
  messageCount: number;
}

function PlatformBadge({ platform }: { platform: string }) {
  const isLine = platform === "LINE";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isLine ? "bg-[#06C755]/10 text-[#06C755]" : "bg-[#0084FF]/10 text-[#0084FF]"
    }`}>
      <Smartphone className="w-3 h-3" />
      {platform}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "LINE" | "Facebook">("all");
  const [sort, setSort] = useState<"updated" | "created" | "name">("updated");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, msgCountRes] = await Promise.all([
        supabase.from("user_ladda(LINE,FACE)").select("*").order("updated_at", { ascending: false }),
        supabase.from("memory_chatladda").select("user_id").eq("role", "user"),
      ]);

      // Count messages per user
      const msgCounts: Record<string, number> = {};
      (msgCountRes.data || []).forEach(m => {
        msgCounts[m.user_id] = (msgCounts[m.user_id] || 0) + 1;
      });

      const userList: User[] = (usersRes.data || []).map(u => ({
        id: u.id,
        line_user_id: u.line_user_id,
        display_name: u.display_name || u.line_user_id,
        created_at: u.created_at,
        updated_at: u.updated_at,
        platform: u.line_user_id?.startsWith("fb:") ? "Facebook" as const : "LINE" as const,
        messageCount: msgCounts[u.line_user_id] || 0,
      }));

      setUsers(userList);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users
    .filter(u => filter === "all" || u.platform === filter)
    .filter(u =>
      !search ||
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.line_user_id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "name") return a.display_name.localeCompare(b.display_name);
      if (sort === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const lineCount = users.filter(u => u.platform === "LINE").length;
  const fbCount = users.filter(u => u.platform === "Facebook").length;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const timeSince = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
    const days = Math.floor(hrs / 24);
    return `${days} วันที่แล้ว`;
  };

  return (
    <>
      <Header title="ผู้ใช้งาน" subtitle={`ทั้งหมด ${users.length} คน`} />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">ทั้งหมด</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{users.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#06C755] rounded-full" />
              <p className="text-sm text-gray-500">LINE</p>
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-1">{lineCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#0084FF] rounded-full" />
              <p className="text-sm text-gray-500">Facebook</p>
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-1">{fbCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {([["all", "ทั้งหมด"], ["LINE", "LINE"], ["Facebook", "Facebook"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === key
                    ? "bg-primary-500 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ / ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm w-48"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
            >
              <option value="updated">ใช้งานล่าสุด</option>
              <option value="created">สมัครล่าสุด</option>
              <option value="name">ชื่อ A-Z</option>
            </select>
            <button onClick={fetchUsers} disabled={loading} className="p-2 hover:bg-gray-100 rounded-xl transition">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ผู้ใช้</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">แพลตฟอร์ม</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ข้อความ</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">สมัครเมื่อ</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ใช้งานล่าสุด</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">ดูแชท</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-sm text-gray-400">{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-bold">
                        {user.display_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{user.display_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{user.line_user_id.substring(0, 20)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <PlatformBadge platform={user.platform} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {user.messageCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{timeSince(user.updated_at)}</td>
                  <td className="py-3 px-4 text-center">
                    <a
                      href={`/chat?user=${user.line_user_id}`}
                      className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-700 text-xs font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      ดู
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">ไม่พบผู้ใช้</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
