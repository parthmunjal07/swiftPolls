import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, Loader2, Radio, CheckCircle2, Trophy } from "lucide-react";
import { joinSession } from "../api/sessions";
import { submitLiveResponse } from "../api/responses";
import { useSocket } from "../context/SocketContext";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { CHART_BAR_COLORS, chartAxisTick, VotesBarTooltip } from "../lib/chartTheme";
import { cn } from "../lib/utils";

type AudienceState = "joining" | "waiting" | "active" | "results" | "ended";

interface LiveQuestion {
  id: string;
  title?: string;
  body?: string;
  options: { id: string; text: string; votes?: number }[];
}

export const AudiencePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const [state, setState] = useState<AudienceState>("joining");
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState(code ?? "");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pollId, setPollId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<LiveQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const joinedRoom = useRef(false);

  const { mutate: doJoin, isPending: isJoining } = useMutation({
    mutationFn: () => joinSession(roomCode, displayName),
    onSuccess: (data) => {
      setSessionId(data.session.id);
      setPollId(data.session.poll_id ?? data.session.pollId ?? null);
      setSessionToken(data.session_token);
      setState("waiting");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Network error: Could not reach the server.";
      setJoinError(msg);
    },
  });

  const { mutate: submitVote, isPending: isSubmittingVote } = useMutation({
    mutationFn: (optionId: string) =>
      submitLiveResponse({
        session_id: sessionId!,
        poll_id: pollId!,
        question_id: currentQuestion!.id,
        option_id: optionId,
        session_token: sessionToken ?? undefined,
      }),
    onSuccess: () => setHasVoted(true),
  });

  // Join WS room after joining session
  useEffect(() => {
    if (!socket || !isConnected || !roomCode || state !== "waiting" || joinedRoom.current) return;
    socket.emit("join_room", roomCode);
    joinedRoom.current = true;
  }, [socket, isConnected, roomCode, state]);

  // Listen to WS events
  useEffect(() => {
    if (!socket) return;

    const handleQuestionChanged = (payload: { current_question_index: number; question?: LiveQuestion }) => {
      if (payload.question) {
        setCurrentQuestion(payload.question);
        setSelectedOption(null);
        setHasVoted(false);
        setResultsVisible(false);
        setVoteCounts({});
        setState("active");
      }
    };

    const handleAnswersOpened = () => {
      setState("active");
    };

    const handleAnswersClosed = () => {
      if (state === "active") setHasVoted(true); // lock UI
    };

    const handleResultsVisible = ({ visible }: { visible: boolean }) => {
      setResultsVisible(visible);
    };

    const handleVoteUpdate = (counts: Record<string, number>) => {
      setVoteCounts(counts);
    };

    const handleSessionEnded = () => {
      setState("ended");
    };

    socket.on("question_changed", handleQuestionChanged);
    socket.on("answers_opened", handleAnswersOpened);
    socket.on("answers_closed", handleAnswersClosed);
    socket.on("results_visible_changed", handleResultsVisible);
    socket.on("vote_update", handleVoteUpdate);
    socket.on("session_ended", handleSessionEnded);

    return () => {
      socket.off("question_changed", handleQuestionChanged);
      socket.off("answers_opened", handleAnswersOpened);
      socket.off("answers_closed", handleAnswersClosed);
      socket.off("results_visible_changed", handleResultsVisible);
      socket.off("vote_update", handleVoteUpdate);
      socket.off("session_ended", handleSessionEnded);
    };
  }, [socket, state]);

  const handleSelectOption = (optionId: string) => {
    if (hasVoted) return;
    setSelectedOption(optionId);
  };

  const handleSubmitVote = () => {
    if (hasVoted || !selectedOption) return;
    submitVote(selectedOption);
  };

  // --- JOIN FORM ---
  if (state === "joining") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
              <Radio className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Join Session</h1>
            <p className="text-muted-foreground mt-1">Enter your name and room code to participate</p>
          </div>

          <Card className="shadow-xl border-border">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base"
                  onKeyDown={(e) => e.key === "Enter" && displayName.trim() && doJoin()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Room Code</label>
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-base font-mono tracking-widest uppercase"
                  onKeyDown={(e) => e.key === "Enter" && displayName.trim() && doJoin()}
                />
              </div>

              {joinError && (
                <div className="text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm">
                  {joinError}
                </div>
              )}

              <Button
                size="lg"
                className="w-full shadow-md shadow-primary/20"
                onClick={() => doJoin()}
                disabled={!displayName.trim() || !roomCode.trim() || isJoining}
              >
                {isJoining ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {isJoining ? "Joining…" : "Join Session"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- WAITING ---
  if (state === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-6">
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="h-10 w-10 text-primary/60" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">You're In!</h1>
            <p className="text-muted-foreground mt-1">Waiting for the host to start the session…</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-muted rounded-full px-5 py-2.5">
            <span className="text-sm text-muted-foreground">Room Code</span>
            <span className="font-mono font-bold text-lg text-foreground tracking-widest">{roomCode}</span>
          </div>
        </div>
      </div>
    );
  }

  // --- ENDED ---
  if (state === "ended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-6">
        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Session Ended</h1>
            <p className="text-muted-foreground mt-1">Thanks for participating!</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" size="lg">Back to Home</Button>
        </div>
      </div>
    );
  }

  // --- ACTIVE QUESTION ---
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const chartData = currentQuestion.options.map((o) => ({
    id: o.id,
    name: o.text,
    votes: voteCounts[o.id] ?? 0,
    pct: totalVotes > 0 ? Math.round(((voteCounts[o.id] ?? 0) / totalVotes) * 100) : 0,
  }));

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">Live</span>
        </div>
        {hasVoted && (
          <div className="flex items-center gap-1.5 text-sm text-primary font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Voted
          </div>
        )}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Question */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Question</p>
          <h2 className="text-2xl font-bold leading-snug">
            {currentQuestion.title ?? currentQuestion.body}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = selectedOption === opt.id;
            const pct = totalVotes > 0 ? Math.round(((voteCounts[opt.id] ?? 0) / totalVotes) * 100) : 0;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                disabled={hasVoted}
                className={cn(
                  "relative w-full overflow-hidden rounded-xl border px-4 py-3.5 text-left text-sm font-medium",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : hasVoted
                      ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted",
                )}
              >
                {resultsVisible && (
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-0 bg-primary/9 transition-[width] duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                )}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="min-w-0 leading-snug">{opt.text}</span>
                  </div>
                  {resultsVisible && (
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">{pct}%</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {!hasVoted && (
          <Button
            size="lg"
            className="w-full shadow-lg shadow-primary/20 mt-6"
            onClick={handleSubmitVote}
            disabled={!selectedOption || isSubmittingVote}
          >
            {isSubmittingVote ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            {isSubmittingVote ? "Submitting…" : "Submit Vote"}
          </Button>
        )}

        {/* Live bar chart (shown when results visible) */}
        {resultsVisible && (
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live results</p>
            </div>
            <CardContent className="p-4 pt-4">
              <ResponsiveContainer width="100%" height={Math.max(100, currentQuestion.options.length * 40)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={chartAxisTick} />
                  <Tooltip content={VotesBarTooltip} cursor={{ fill: "var(--muted)", fillOpacity: 0.45 }} />
                  <Bar dataKey="votes" radius={[0, 8, 8, 0]}>
                    {chartData.map((row, i) => (
                      <Cell key={row.id} fill={CHART_BAR_COLORS[i % CHART_BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
