import api from "../lib/axios";

export const submitLiveResponse = async (data: {
  session_id: string;
  poll_id: string;
  question_id: string;
  option_id: string;
  session_token?: string;
}) => {
  const response = await api.post("/responses", data);
  return response.data;
};

export const submitAsyncResponse = async (data: {
  poll_id: string;
  answers: { question_id: string; option_id: string }[];
  dedup_token: string;
}) => {
  const response = await api.post("/responses/async", data);
  return response.data;
};

export const getQuestionResponses = async (pollId: string, questionId: string) => {
  const { data } = await api.get(`/responses/poll/${pollId}/question/${questionId}`);
  return data;
};

export const getSessionResponses = async (sessionId: string) => {
  const { data } = await api.get(`/responses/session/${sessionId}`);
  return data;
};
