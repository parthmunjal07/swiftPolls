import api from "../lib/axios";
import type { Poll, PollSummary } from "../types";

export const fetchPolls = async (): Promise<PollSummary[]> => {
  const { data } = await api.get("/polls");
  return data.polls ?? data;
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
