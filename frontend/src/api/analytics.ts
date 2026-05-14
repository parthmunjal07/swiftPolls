import api from "../lib/axios";
import type { PollAnalytics } from "../types";

export const fetchPollAnalytics = async (pollId: string): Promise<PollAnalytics> => {
  const { data } = await api.get(`/analytics/${pollId}`);
  return data;
};

export const fetchPollSummaryAnalytics = async (pollId: string): Promise<{ totalResponses: number }> => {
  const { data } = await api.get(`/analytics/${pollId}/summary`);
  return data;
};
