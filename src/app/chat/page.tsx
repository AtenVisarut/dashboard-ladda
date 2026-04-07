"use client";

import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import { Search, Send, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

interface Conversation {
  user_id: string;
  display_name: string;
  platform: "LINE" | "Facebook";
  last_message: string;
  last_message_at: string;
  has_handoff: boolean;
}

interface Message {
  id: number;
  role: string;
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

function ChatInput({ userId, onSent }: { userId: string; onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string>("");

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setStatus("");
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/admin/conversations/${encodeURIComponent(userId)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: message.trim() }),
      });
      if (res.ok) {
        setMessage("");
        setStatus("sent");
        onSent();
        setTimeout(() => setStatus(""), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="พิมพ์ข้อความตอบกลับ..."
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary-500 transition"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition disabled:opacity-50"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      {status === "sent" && <p className="text-[10px] text-green-500 mt-1 px-1">ส่งสำเร็จ</p>}
      {status === "error" && <p className="text-[10px] text-red-500 mt-1 px-1">ส่งไม่สำเร็จ — ตรวจสอบ backend</p>}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const isLine = platform === "LINE";
  return (
    <span className={`${isLine ? "bg-[#06C755]" : "bg-[#0084FF]"} text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center`}>
      {isLine ? "L" : "FB"}
    </span>
  );
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      // Get all users
      const { data: users } = await supabase
        .from("user_ladda(LINE,FACE)")
        .select("line_user_id, display_name, updated_at")
        .order("updated_at", { ascending: false });

      // Get handoffs
      const { data: handoffs } = await supabase
        .from("admin_handoffs")
        .select("user_id, status")
        .in("status", ["pending", "active"]);

      const handoffUserIds = new Set((handoffs || []).map(h => h.user_id));

      // Get last message per user (from recent memory)
      const { data: recentMessages } = await supabase
        .from("memory_chatladda")
        .select("user_id, content, role, created_at")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(200);

      // Build conversation list
      const lastMsgMap: Record<string, { content: string; created_at: string }> = {};
      (recentMessages || []).forEach(m => {
        if (!lastMsgMap[m.user_id]) {
          lastMsgMap[m.user_id] = { content: m.content, created_at: m.created_at };
        }
      });

      const convs: Conversation[] = (users || [])
        .filter(u => lastMsgMap[u.line_user_id])
        .map(u => ({
          user_id: u.line_user_id,
          display_name: u.display_name || u.line_user_id,
          platform: u.line_user_id.startsWith("fb:") ? "Facebook" as const : "LINE" as const,
          last_message: (lastMsgMap[u.line_user_id]?.content || "").substring(0, 80),
          last_message_at: lastMsgMap[u.line_user_id]?.created_at || "",
          has_handoff: handoffUserIds.has(u.line_user_id),
        }))
        .sort((a, b) => {
          if (a.has_handoff !== b.has_handoff) return a.has_handoff ? -1 : 1;
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        });

      setConversations(convs);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    setMessagesLoading(true);
    try {
      const { data } = await supabase
        .from("memory_chatladda")
        .select("id, role, content, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(50);

      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (selectedUserId) fetchMessages(selectedUserId);
  }, [selectedUserId, fetchMessages]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedUserId) fetchMessages(selectedUserId);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedUserId, fetchConversations, fetchMessages]);

  const filteredConvs = conversations.filter(c =>
    !searchQuery ||
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.user_id === selectedUserId);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "เมื่อสักครู่";
    if (diffMin < 60) return `${diffMin} นาที`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ชม.`;
    return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
  };

  return (
    <>
      <Header title="แชท" subtitle="จัดการสนทนากับผู้ใช้" />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Conversation List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-100 flex items-center gap-2">
            <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 py-2 gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-sm flex-1"
              />
            </div>
            <button onClick={fetchConversations} className="p-2 hover:bg-gray-100 rounded-xl">
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Handoff count */}
          {conversations.filter(c => c.has_handoff).length > 0 && (
            <div className="px-3 py-2 bg-red-50 border-b border-red-100">
              <p className="text-xs font-semibold text-red-600">
                รอตอบ ({conversations.filter(c => c.has_handoff).length})
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {filteredConvs.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => setSelectedUserId(conv.user_id)}
                className={`w-full px-3 py-3 flex items-start gap-3 hover:bg-gray-50 transition border-b border-gray-50 ${
                  selectedUserId === conv.user_id ? "bg-primary-50" : ""
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">
                    {conv.display_name[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <PlatformBadge platform={conv.platform} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 truncate">{conv.display_name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message}</p>
                </div>
                {conv.has_handoff && <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-1" />}
              </button>
            ))}
            {!loading && filteredConvs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">ไม่พบสนทนา</p>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">
                    {selectedConv.display_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedConv.display_name}</p>
                    <p className="text-[10px] text-gray-400">{selectedConv.platform} | {selectedConv.user_id.substring(0, 15)}...</p>
                  </div>
                </div>
                {selectedConv.has_handoff && (
                  <button className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                )}
              </div>

              {/* Handoff Banner */}
              {selectedConv.has_handoff && (
                <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Bot ไม่สามารถตอบได้ — กรุณาตอบกลับผู้ใช้</span>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messagesLoading ? (
                  <p className="text-sm text-gray-400 text-center py-8">กำลังโหลด...</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-white border border-gray-200 text-gray-800"
                          : "bg-primary-500 text-white"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-gray-400" : "text-primary-200"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <ChatInput userId={selectedUserId} onSent={() => fetchMessages(selectedUserId)} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <p className="text-gray-400">เลือกสนทนาจากรายการด้านซ้าย</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
