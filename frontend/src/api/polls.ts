import api from "../lib/axios";
import type { Poll, PollSummary } from "../types";

export const fetchPolls = async (): Promise<PollSummary[]> => {
  const { data } = await api.get("/polls");
  const raw = (data.polls ?? data) as Record<string, unknown>[];

  return raw.map((p) => {
    const publishedAt = p.published_at as string | null | undefined;
    const expiresAt = p.expires_at as string | null | undefined;
    const isActive = p.is_active !== false;

    let status: PollSummary["status"] = "draft";
    if (publishedAt) {
      if (!isActive) status = "ended";
      else if (expiresAt && new Date(expiresAt) < new Date()) status = "ended";
      else status = "active";
    }

    return {
      id: String(p.id),
      title: String(p.title ?? ""),
      mode: (p.mode as PollSummary["mode"]) ?? "live",
      status,
      createdAt: (p.created_at as string) ?? undefined,
      created_at: p.created_at as string | undefined,
      totalResponses: typeof p.totalResponses === "number" ? p.totalResponses : 0,
      slug: p.slug as string | undefined,
    };
  });
};

export const fetchPollById = async (id: string): Promise<Poll> => {
  const { data } = await api.get(`/polls/${id}`);
  return data.poll ?? data;
};

export const fetchPollBySlug = async (slug: string): Promise<{ poll: Poll; view: "form" | "results" | "expired" }> => {
  const { data } = await api.get(`/polls/slug/${slug}`);
  return data;
};

export const createPoll = async (pollData: any): Promise<Poll> => {
  const { data } = await api.post("/polls", pollData);
  return data.poll ?? data;
};

export const updatePoll = async (id: string, pollData: any): Promise<Poll> => {
  const { data } = await api.patch(`/polls/${id}`, pollData);
  return data.poll ?? data;
};

export const publishPoll = async (id: string): Promise<Poll> => {
  const { data } = await api.patch(`/polls/${id}/publish`);
  return data.poll ?? data;
};

export const deletePoll = async (id: string): Promise<void> => {
  await api.delete(`/polls/${id}`);
};
