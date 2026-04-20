"use client";

import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import {
  FileText, Plus, Pencil, Trash2, Copy, X, Search as SearchIcon,
  Tag, TrendingUp, RefreshCw,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";

interface Template {
  id: number;
  title: string;
  category: string;
  content: string;
  placeholders: string[];
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_OPTIONS = [
  { value: "handoff", label: "Handoff", color: "bg-red-100 text-red-700" },
  { value: "usage", label: "วิธีใช้", color: "bg-blue-100 text-blue-700" },
  { value: "general", label: "ทั่วไป", color: "bg-gray-100 text-gray-700" },
  { value: "product", label: "สินค้า", color: "bg-green-100 text-green-700" },
  { value: "greeting", label: "ทักทาย", color: "bg-yellow-100 text-yellow-700" },
];

function categoryBadge(category: string) {
  const cfg = CATEGORY_OPTIONS.find((c) => c.value === category);
  return cfg || CATEGORY_OPTIONS[2];
}

function extractPlaceholders(content: string): string[] {
  const matches = content.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [];
  const unique = Array.from(new Set(matches.map((m) => m.slice(1, -1))));
  return unique;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  // Editor state
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "general",
    content: "",
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("admin_templates")
        .select("*")
        .order("usage_count", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(500);
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (filterCat !== "all" && t.category !== filterCat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [templates, search, filterCat]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", category: "general", content: "" });
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ title: t.title, category: t.category, content: t.content });
    setShowForm(true);
  };

  const saveTemplate = async () => {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      alert("กรุณาใส่ชื่อและเนื้อหา");
      return;
    }
    const placeholders = extractPlaceholders(content);
    try {
      if (editing) {
        await supabase
          .from("admin_templates")
          .update({ title, category: form.category, content, placeholders })
          .eq("id", editing.id);
      } else {
        await supabase.from("admin_templates").insert({
          title,
          category: form.category,
          content,
          placeholders,
        });
      }
      setShowForm(false);
      await fetchTemplates();
    } catch (err) {
      console.error("Save failed:", err);
      alert("บันทึกไม่สำเร็จ");
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("ลบ template นี้?")) return;
    try {
      await supabase.from("admin_templates").delete().eq("id", id);
      await fetchTemplates();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // lightweight toast
      const el = document.createElement("div");
      el.textContent = "คัดลอกแล้ว";
      el.className = "fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-xl shadow-lg z-50";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    } catch {
      alert("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <>
      <Header title="เทมเพลตคำตอบ" subtitle="Response Templates สำหรับ admin ใช้ตอบลูกค้าเร็วขึ้น" />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-white rounded-xl px-3 py-2 gap-2 border border-gray-200 flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา template..."
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setFilterCat("all")}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
                filterCat === "all"
                  ? "bg-primary-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              ทั้งหมด
            </button>
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
                  filterCat === c.value
                    ? "bg-primary-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-xl transition border border-gray-200 bg-white"
            title="รีเฟรช"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={openCreate}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition"
          >
            <Plus className="w-4 h-4" /> เพิ่ม template
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const cat = categoryBadge(t.category);
            return (
              <div
                key={t.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{t.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`${cat.color} text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}>
                        <Tag className="w-3 h-3" />
                        {cat.label}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        ใช้ {t.usage_count} ครั้ง
                      </span>
                    </div>
                  </div>
                </div>

                <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 rounded-xl p-3 flex-1 max-h-40 overflow-auto font-sans">
{t.content}
                </pre>

                {t.placeholders && t.placeholders.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {t.placeholders.map((p) => (
                      <code
                        key={p}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                      >
                        {"{" + p + "}"}
                      </code>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(t.content)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-medium transition"
                  >
                    <Copy className="w-4 h-4" /> คัดลอก
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition"
                    title="แก้ไข"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">
                {search || filterCat !== "all" ? "ไม่พบ template ที่ตรงเงื่อนไข" : "ยังไม่มี template — กดปุ่ม \"เพิ่ม template\" เพื่อสร้าง"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create/Edit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {editing ? "แก้ไข template" : "สร้าง template ใหม่"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  ชื่อ template
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="เช่น ตอบเมื่อลูกค้าถามราคา"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  หมวดหมู่
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500 bg-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  เนื้อหา <span className="text-gray-400 text-xs">(ใช้ {"{placeholder}"} สำหรับค่าที่จะแทนทีหลัง)</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={8}
                  placeholder="พิมพ์เนื้อหา template... ใช้ {product_name}, {plant} ฯลฯ เป็นตัวแปร"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500 font-mono"
                />
                {form.content && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {extractPlaceholders(form.content).map((p) => (
                      <code
                        key={p}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                      >
                        {"{" + p + "}"}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t border-gray-200">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveTemplate}
                className="ml-auto px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition"
              >
                {editing ? "บันทึกการแก้ไข" : "สร้าง template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
