import api from "../lib/axios";

export const submitLiveResponse = async (data: {
  session_id: number;
  poll_id: number;
  ques_id: number;
  option_id: number;
  session_token?: string;
}) => {
  const response = await api.post("/responses", data);
  return response.data;
};

export const submitAsyncResponse = async (data: {
  poll_id: number; // Changed to number
  answers: { ques_id: number; option_id: number }[]; // Changed to ques_id and numbers
  session_token: string; // Changed to session_token
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
