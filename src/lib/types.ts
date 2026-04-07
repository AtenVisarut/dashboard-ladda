export interface DashboardStats {
  unique_users: number;
  questions_asked: number;
  total_requests: number;
  error_count: number;
  avg_response_time_ms: number;
  error_rate: number;
  health_status: "healthy" | "degraded" | "unhealthy";
  platform_breakdown: {
    line: { users: number; messages: number };
    facebook: { users: number; messages: number };
  };
  top_intents: Array<{ intent: string; count: number }>;
  top_questions: Array<{ question: string; count: number }>;
  daily_series: Array<{
    date: string;
    requests: number;
    unique_users: number;
    avg_response_time: number;
    error_rate: number;
  }>;
}

export interface Conversation {
  user_id: string;
  display_name: string;
  platform: "LINE" | "Facebook";
  last_message: string;
  last_message_at: string;
  has_handoff: boolean;
  handoff_status?: "pending" | "active" | "resolved";
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: {
    type?: string;
    admin?: string;
    products?: string[];
  };
}

export interface Handoff {
  id: number;
  user_id: string;
  platform: string;
  display_name: string;
  trigger_message: string;
  status: "pending" | "active" | "resolved";
  assigned_admin?: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  alert_type: string;
  message: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
}

export interface Product {
  id: number;
  product_name: string;
  product_category: string;
  applicable_crops: string;
  active_ingredient: string;
  strategy: string;
}
