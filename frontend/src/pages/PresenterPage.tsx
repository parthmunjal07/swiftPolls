import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  ChevronLeft, ChevronRight, Eye, EyeOff, Unlock, Lock,
  StopCircle, Loader2, Users, Wifi, WifiOff, AlertTriangle,
} from "lucide-react";
import { fetchPollById } from "../api/polls";
import { useSocket } from "../context/SocketContext";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { CHART_BAR_COLORS, chartAxisTick, VotesBarTooltip } from "../lib/chartTheme";
import type { Question } from "../types";

interface SessionState {
  roomCode: string;
  pollId: string;
  currentIndex: number;
  answersOpen: boolean;
  resultsVisible: boolean;
  voteCounts: Record<string, Record<string, number>>;
}

export const PresenterPage = () => {
  const { sessionId: _sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  // We get session info passed via location.state from the StartSession modal
  // If not present, we try to extract roomCode from URL query param
  const params = new URLSearchParams(window.location.search);
  const roomCodeFromUrl = params.get("code") ?? "";
  const pollIdFromUrl = params.get("pollId") ?? "";

  const [session, setSession] = useState<SessionState>({
    roomCode: roomCodeFromUrl,
    pollId: pollIdFromUrl,
    currentIndex: 0,
    answersOpen: false,
    resultsVisible: false,
    voteCounts: {},
  });
  const [showEndModal, setShowEndModal] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  const { data: poll, isLoading } = useQuery({
    queryKey: ["poll", session.pollId],
    queryFn: () => fetchPollById(session.pollId),
    enabled: !!session.pollId,
  });

  // Join the WS room as host
  useEffect(() => {
    if (!socket || !isConnected || !session.roomCode) return;
    socket.emit("join_room", session.roomCode);
  }, [socket, isConnected, session.roomCode]);

  // Listen to vote updates broadcast from backend
  useEffect(() => {
    if (!socket) return;
    const handleVoteUpdate = (data: { questionId: string; counts: Record<string, number> }) => {
      setSession((prev) => ({
        ...prev,
        voteCounts: {
          ...prev.voteCounts,
          [data.questionId]: data.counts,
        },
      }));
    };
    socket.on("vote_update", handleVoteUpdate);
    return () => { socket.off("vote_update", handleVoteUpdate); };
  }, [socket]);

  const emit = useCallback((event: string, payload: object) => {
    if (socket && isConnected) {
      socket.emit(event, { room_code: session.roomCode, ...payload });
    }
  }, [socket, isConnected, session.roomCode]);

  const goToQuestion = (index: number) => {
    if (!poll) return;
    const newIndex = Math.max(0, Math.min(index, poll.questions.length - 1));
    setSession((prev) => ({ ...prev, currentIndex: newIndex, answersOpen: false, resultsVisible: false }));
    emit("next_question", { new_index: newIndex });
  };

  const toggleAnswers = () => {
    const willOpen = !session.answersOpen;
    setSession((prev) => ({ ...prev, answersOpen: willOpen }));
    emit(willOpen ? "open_answers" : "close_answers", {});
  };

  const toggleResults = () => {
    const willShow = !session.resultsVisible;
    setSession((prev) => ({ ...prev, resultsVisible: willShow }));
    emit("set_results_visible", { visible: willShow });
  };

  const endSession = () => {
    emit("end_session", {});
    setHasEnded(true);
    setShowEndModal(false);
    setTimeout(() => navigate("/dashboard"), 1500);
  };

  if (isLoading || !poll) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!session.roomCode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Session Not Found</h2>
          <p className="text-muted-foreground">No room code found. Please start a session from the dashboard.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (hasEnded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3 animate-in fade-in duration-500">
          <StopCircle className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Session Ended</h2>
          <p className="text-muted-foreground">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  const currentQuestion: Question = poll.questions[session.currentIndex];
  const questionVotes = session.voteCounts[currentQuestion?.id ?? ""] ?? {};
  const totalVotes = Object.values(questionVotes).reduce((a, b) => a + b, 0);
  const chartData = currentQuestion?.options.map((o) => ({
    name: o.text,
    votes: questionVotes[o.id ?? ""] ?? 0,
    pct: totalVotes > 0 ? Math.round(((questionVotes[o.id ?? ""] ?? 0) / totalVotes) * 100) : 0,
  })) ?? [];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top Bar */}
      <div className="bg-background border-b border-border h-14 flex items-center px-4 gap-4 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium flex items-center gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </button>
        <div className="h-5 w-px bg-border" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold truncate text-sm">{poll.title}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isConnected ? "Live" : "Disconnected"}
          </div>
          {/* Room code chip */}
          <div className="bg-primary/10 text-primary rounded-lg px-3 py-1 text-sm font-mono font-bold tracking-widest flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            {session.roomCode}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Navigator */}
        <aside className="w-64 shrink-0 bg-background border-r border-border overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Questions</p>
          </div>
          <div className="flex-1 p-2 space-y-1">
            {poll.questions.map((q: Question, i: number) => (
              <button
                key={q.id ?? i}
                onClick={() => goToQuestion(i)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 ${
                  i === session.currentIndex
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    i === session.currentIndex ? "bg-white/20" : "bg-muted-foreground/20 text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium leading-snug line-clamp-2">
                    {q.title ?? q.body ?? `Question ${i + 1}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right: Current Question + Chart */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentQuestion ? (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Question {session.currentIndex + 1} of {poll.questions.length}
                </p>
                <h2 className="text-2xl font-bold leading-snug">
                  {currentQuestion.title ?? currentQuestion.body}
                </h2>
              </div>

              {/* Options preview */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {currentQuestion.options.map((opt, idx) => (
                  <div
                    key={opt.id ?? idx}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{opt.text}</span>
                    {session.resultsVisible && (
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                        {chartData[idx]?.pct ?? 0}%
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Live bar chart */}
              <Card>
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live results</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{totalVotes} responses</p>
                </div>
                <CardContent className="p-5">
                  {totalVotes === 0 ? (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                      Waiting for votes…
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(120, currentQuestion.options.length * 48)}>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={140} tick={chartAxisTick} />
                        <Tooltip content={<VotesBarTooltip />} cursor={{ fill: "var(--muted)", fillOpacity: 0.45 }} />
                        <Bar dataKey="votes" radius={[0, 8, 8, 0]}>
                          {chartData.map((_: unknown, i: number) => (
                            <Cell key={i} fill={CHART_BAR_COLORS[i % CHART_BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No question selected
            </div>
          )}
        </main>
      </div>

      {/* Bottom Toolbar */}
      <div className="bg-background border-t border-border h-16 flex items-center px-4 gap-3 shrink-0">
        {/* Prev */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToQuestion(session.currentIndex - 1)}
          disabled={session.currentIndex === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToQuestion(session.currentIndex + 1)}
          disabled={session.currentIndex === poll.questions.length - 1}
          className="gap-1.5"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Open/Close Answers */}
        <Button
          variant={session.answersOpen ? "primary" : "outline"}
          size="sm"
          onClick={toggleAnswers}
          className="gap-1.5"
        >
          {session.answersOpen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {session.answersOpen ? "Close Answers" : "Open Answers"}
        </Button>

        {/* Show/Hide Results */}
        <Button
          variant={session.resultsVisible ? "primary" : "outline"}
          size="sm"
          onClick={toggleResults}
          className="gap-1.5"
        >
          {session.resultsVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {session.resultsVisible ? "Hide Results" : "Show Results"}
        </Button>

        <div className="flex-1" />

        {/* End Session */}
        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowEndModal(true)}
          className="gap-1.5"
        >
          <StopCircle className="h-4 w-4" /> End Session
        </Button>
      </div>

      {/* End Session Confirmation Modal */}
      <Modal isOpen={showEndModal} onClose={() => setShowEndModal(false)} title="End Session?">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            This will end the session for all participants and they will see a final screen. This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowEndModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={endSession}>End Session</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
