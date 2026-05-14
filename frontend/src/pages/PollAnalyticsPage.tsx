
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, BarChart3, Clock, Rocket, TrendingUp, ChevronDown } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { fetchPollAnalytics } from "../api/analytics";
import { publishPoll } from "../api/polls";
import { useSocket } from "../context/SocketContext";
import type { PollAnalytics, QuestionAnalytics } from "../types";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{payload[0].value}</span> votes
        </p>
      </div>
    );
  }
  return null;
};

export const PollAnalyticsPage = () => {
  const { id: pollId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<"results" | "trends">("results");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<PollAnalytics | null>(null);

  const { data: pollAnalytics, isLoading, error } = useQuery({
    queryKey: ["analytics", pollId],
    queryFn: () => fetchPollAnalytics(pollId!),
    enabled: !!pollId,
  });

  const { mutate: publishPollMutation, isPending: isPublishing } = useMutation({
    mutationFn: () => publishPoll(pollId!),
    onSuccess: () => {
      // Refetch analytics
      navigate("/dashboard");
    },
  });

  // WebSocket listener for live updates
  useEffect(() => {
    if (!socket || !pollId) return;

    const handleLiveUpdate = (data: PollAnalytics) => {
      setLiveData(data);
    };

    socket.on(`poll:${pollId}:update`, handleLiveUpdate);

    return () => {
      socket.off(`poll:${pollId}:update`, handleLiveUpdate);
    };
  }, [socket, pollId]);

  const data =
    liveData && pollAnalytics
      ? {
          ...pollAnalytics,
          ...liveData,
          status: liveData.status ?? pollAnalytics.status,
          title: liveData.title ?? pollAnalytics.title,
          totalResponses: liveData.totalResponses ?? pollAnalytics.totalResponses,
          questions:
            liveData.questions?.length && liveData.questions.length > 0
              ? liveData.questions
              : pollAnalytics.questions,
        }
      : liveData || pollAnalytics;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load poll analytics</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    ended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  } as const;

  const rawStatus = data.status ?? "draft";
  const pollStatus: keyof typeof statusColors =
    rawStatus === "active" || rawStatus === "ended" || rawStatus === "draft"
      ? rawStatus
      : "draft";
  const statusLabel = pollStatus.charAt(0).toUpperCase() + pollStatus.slice(1);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/20 pb-20">

      {/* Top Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="border-l border-border pl-4">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[pollStatus]}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <Button
            onClick={() => publishPollMutation()}
            disabled={isPublishing || pollStatus !== "draft"}
            className="gap-2"
          >
            <Rocket className="h-4 w-4" />
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            {data.title}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Real-time Analytics Dashboard
            {liveData && <span className="ml-2 inline-flex items-center gap-1 text-green-600">🔴 Live</span>}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-border shadow-sm bg-linear-to-br from-background to-primary/5">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-4 bg-primary/10 text-primary rounded-xl">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                <h2 className="text-4xl font-bold">{data.totalResponses}</h2>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-linear-to-br from-background to-blue-500/5">
            <CardContent className="p-6 flex items-center space-x-4">
              <div className="p-4 bg-blue-500/10 text-blue-500 rounded-xl">
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <h2 className="text-2xl font-bold">{new Date(data.createdAt).toLocaleDateString()}</h2>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("results")}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "results"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <BarChart3 className="h-4 w-4" /> Results
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "trends"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <TrendingUp className="h-4 w-4" /> Trends
          </button>
        </div>

        {/* Results Tab */}
        {activeTab === "results" && (
          <div className="space-y-6">
            {data.questions.map((question) => (
              <QuestionAccordion
                key={question.id}
                question={question}
                isExpanded={expandedQuestion === question.id}
                onToggle={() =>
                  setExpandedQuestion(
                    expandedQuestion === question.id ? null : question.id
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === "trends" && (
          <div className="space-y-6">
            {data.questions.map((question) => (
              question.trend && question.trend.length > 0 && (
                <Card key={question.id} className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle>{question.title} - Vote Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={question.trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="votes"
                            stroke="hsl(var(--primary))"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface QuestionAccordionProps {
  question: QuestionAnalytics;
  isExpanded: boolean;
  onToggle: () => void;
}

const QuestionAccordion: React.FC<QuestionAccordionProps> = ({
  question,
  isExpanded,
  onToggle,
}) => {
  const colors = ["#16a34a", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
  const enrichedOptions = question.options.map((opt, idx) => ({
    ...opt,
    color: colors[idx % colors.length],
  }));

  const leadingOption = [...enrichedOptions].sort((a, b) => b.votes - a.votes)[0];

  return (
    <Card className="border-border shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 text-left">
          <h3 className="font-semibold">{question.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {question.totalResponses} responses • Leading: <span className="font-medium">{leadingOption.text}</span>
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="border-t border-border p-6 space-y-6">
          {/* Bar Chart */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrichedOptions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="text" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                  {enrichedOptions.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">Percentage Breakdown</h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={enrichedOptions}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="votes"
                    >
                      {enrichedOptions.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {enrichedOptions.map((opt) => {
                const percentage = Math.round((opt.votes / question.totalResponses) * 100);
                return (
                  <div key={opt.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: opt.color }}></div>
                      <span className="text-sm font-medium truncate">{opt.text}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{opt.votes}</span>
                      <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
