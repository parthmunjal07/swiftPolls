import api from "../lib/axios";
import type { Session } from "../types";

export const createSession = async (pollId: string): Promise<{ session: Session }> => {
  const { data } = await api.post(`/sessions`, { poll_id: Number(pollId) });
  return data;
};

export const getSession = async (sessionId: string): Promise<{ session: Session }> => {
  const { data } = await api.get(`/sessions/${sessionId}`);
  return data;
};

export const getSessionByCode = async (code: string): Promise<{ session: Session }> => {
  const { data } = await api.get(`/sessions/code/${code}`);
  return data;
};

export const joinSession = async (
  roomCode: string,
  displayName: string
): Promise<{ session: Session; participant: any; session_token: string }> => {
  const { data } = await api.post(`/sessions/join`, {
    room_code: roomCode,
    display_name: displayName,
  });
  return data;
};

export const endSession = async (sessionId: string): Promise<Session> => {
  const { data } = await api.patch(`/sessions/${sessionId}/end`);
  return data;
};

export const advanceQuestion = async (
  sessionId: string,
  questionId: string
): Promise<Session> => {
  const { data } = await api.patch(`/sessions/${sessionId}/advance`, { questionId });
  return data;
};
