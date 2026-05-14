export interface User {
  id: string;
  email: string;
  name: string;
}

export type PollMode = "live" | "async";
export type PollStatus = "draft" | "active" | "ended";

export interface Option {
  id?: string;
  text: string;
  display_order?: number;
}

export interface QuestionSettings {
  show_results_live: boolean;
  time_limit?: number | null;
  time_limit_secs?: number | null;
}

export interface Question {
  id?: string;
  pollId?: string;
  poll_id?: string;
  title: string;
  body?: string;
  is_mandatory: boolean;
  display_order?: number;
  settings: QuestionSettings;
  options: Option[];
}

export interface Poll {
  id: string;
  hostId?: string;
  user_id?: string;
  title: string;
  description?: string;
  slug?: string;
  mode: PollMode;
  status: PollStatus;
  is_active?: boolean;
  is_anonymous?: boolean;
  expiresAt?: string | null;
  expires_at?: string | null;
  published_at?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  questions: Question[];
}

export interface PollSummary {
  id: string;
  title: string;
  mode: PollMode;
  status: PollStatus;
  createdAt?: string;
  created_at?: string;
  totalResponses: number;
  slug?: string;
}

export interface OptionAnalytics {
  id: string;
  text: string;
  votes: number;
}

export interface QuestionAnalytics {
  id: string;
  title: string;
  totalResponses: number;
  options: OptionAnalytics[];
  trend?: { timestamp: string; votes: number }[];
}

export interface PollAnalytics {
  id: string;
  title: string;
  status: PollStatus;
  mode: PollMode;
  createdAt: string;
  totalResponses: number;
  questions: QuestionAnalytics[];
}

export interface Session {
  id: string;
  pollId?: string;
  poll_id?: string;
  joinCode?: string;
  room_code?: string;
  status: "waiting" | "active" | "ended";
  currentQuestionId?: string | null;
  current_question_index?: number;
  results_visible?: boolean;
  started_at?: string;
  ended_at?: string | null;
}

export interface SessionWithPoll extends Session {
  poll: Poll;
}

export interface AsyncPollView {
  poll: Poll;
  view: "form" | "results" | "expired";
}

export interface LiveResponse {
  session_id: string;
  poll_id: string;
  question_id: string;
  option_id: string;
  session_token?: string;
}

export interface Response {
  id: string;
  sessionId?: string;
  session_id?: string;
  pollId?: string;
  poll_id?: string;
  questionId?: string;
  question_id?: string;
  optionId?: string;
  option_id?: string;
  respondentId?: string;
  createdAt?: string;
  created_at?: string;
}

export interface DashboardAnalytics {
  totalPollsCreated: number;
  totalActivePolls: number;
  totalResponses: number;
  recentPolls: PollSummary[];
}

export interface PollCardData extends PollSummary {
  questionCount: number;
  nextSessionDate?: string;
}
