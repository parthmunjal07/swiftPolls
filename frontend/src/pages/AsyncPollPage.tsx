import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, AlertTriangle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { fetchPollBySlug } from "../api/polls";
import { submitAsyncResponse } from "../api/responses";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { CHART_BAR_COLORS, chartAxisTick, VotesBarTooltip } from "../lib/chartTheme";
import { cn } from "../lib/utils";
import { ThankYouPage } from "./ThankYouPage";
import type { Question } from "../types";

export const AsyncPollPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const dedupKey = `pb_submitted_${slug}`;
  const alreadySubmitted = !!localStorage.getItem(dedupKey);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["poll-slug", slug],
    queryFn: () => fetchPollBySlug(slug!),
    enabled: !!slug,
  });

  const { mutate: submit, isPending: isSubmitting } = useMutation({
    mutationFn: submitAsyncResponse,
    onSuccess: () => {
      localStorage.setItem(dedupKey, "1");
      setSubmitted(true);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Poll Not Found</h2>
          <p className="text-muted-foreground">This poll doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (data.view === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm animate-in fade-in duration-500">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold">Poll Expired</h1>
          <p className="text-muted-foreground">This poll is no longer accepting responses.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const poll = data.poll;
  const view = data.view;

  if (submitted) {
    return <ThankYouPage pollSlug={slug} pollTitle={poll.title} showResults={view === "results"} />;
  }

  if (alreadySubmitted && view !== "results") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm animate-in fade-in duration-500">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Already Submitted</h1>
          <p className="text-muted-foreground">You've already responded to this poll from this device.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  if (view === "results") {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-background border-b border-border sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
            <div className="flex-1">
              <h1 className="font-bold text-lg truncate">{poll.title}</h1>
              <p className="text-xs text-muted-foreground">Results</p>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-500">
          {poll.questions.map((q: any, i: number) => {
            const totalVotes = q.options.reduce((acc: number, o: any) => acc + (o.votes ?? 0), 0);
            const chartData = q.options.map((o: any) => ({
              name: o.text,
              votes: o.votes ?? 0,
              pct: totalVotes > 0 ? Math.round(((o.votes ?? 0) / totalVotes) * 100) : 0,
            }));
            return (
              <Card key={q.id ?? i} className="overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/40">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question {i + 1}</span>
                  <h3 className="font-semibold mt-1">{q.title ?? q.body}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalVotes} responses</p>
                </div>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={Math.max(120, q.options.length * 44)}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 48 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={130} tick={chartAxisTick} />
                      <Tooltip content={VotesBarTooltip} cursor={{ fill: "var(--muted)", fillOpacity: 0.45 }} />
                      <Bar dataKey="votes" radius={[0, 8, 8, 0]}>
                        {chartData.map((_: any, idx: number) => (
                          <Cell key={idx} fill={CHART_BAR_COLORS[idx % CHART_BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const mandatoryIds = poll.questions.filter((q: Question) => q.is_mandatory).map((q: Question) => q.id!);

  const handleSubmit = () => {
    setValidationError(null);
    const missing = mandatoryIds.filter((id: string) => !answers[id]);
    if (missing.length > 0) {
      setValidationError(`Please answer all required questions (${missing.length} remaining).`);
      return;
    }
    submit({
      poll_id: Number(poll.id),
      answers: Object.entries(answers).map(([ques_id, option_id]) => ({
        ques_id: Number(ques_id),
        option_id: Number(option_id)
      })),
      session_token: crypto.randomUUID(),
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="font-bold text-lg truncate">{poll.title}</h1>
            {poll.description && <p className="text-xs text-muted-foreground truncate">{poll.description}</p>}
          </div>
          {poll.expires_at && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Closes {new Date(poll.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {poll.questions.map((q: Question, i: number) => (
          <QuestionCard
            key={q.id ?? i}
            question={q}
            index={i}
            selectedOption={answers[q.id!]}
            onSelect={(optionId) => setAnswers((prev) => ({ ...prev, [q.id!]: optionId }))}
          />
        ))}

        {validationError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {validationError}
          </div>
        )}

        <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="w-full shadow-lg shadow-primary/20 gap-2">
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
          {isSubmitting ? "Submitting…" : "Submit Responses"}
        </Button>
      </div>
    </div>
  );
};

const QuestionCard: React.FC<{ question: Question; index: number; selectedOption?: string; onSelect: (id: string) => void }> = ({
  question, index, selectedOption, onSelect,
}) => (
  <Card className="overflow-hidden">
    <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-start justify-between gap-4">
      <div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question {index + 1}</span>
        <h3 className="font-semibold mt-1">{question.title ?? question.body}</h3>
      </div>
      {question.is_mandatory && <span className="text-xs text-red-500 font-medium shrink-0 mt-1">Required</span>}
    </div>
    <CardContent className="p-4 space-y-2.5">
      {question.options.map((opt) => {
        const isSelected = selectedOption === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id!)}
            className={cn(
              "w-full text-left rounded-xl border px-4 py-3.5 text-sm font-medium",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/35 bg-background",
                )}
              >
                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
              </div>
              {opt.text}
            </div>
          </button>
        );
      })}
    </CardContent>
  </Card>
);
