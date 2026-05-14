import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Clock, MoreVertical, Play, Zap, Share2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { publishPoll } from "../../api/polls";

interface PollCardProps {
  id: string;
  title: string;
  status: "active" | "draft" | "ended";
  totalResponses: number;
  createdAt: string;
  mode: "live" | "async";
  slug?: string;
  onStartSession?: (pollId: string) => void;
  onShareLink?: (slug: string) => void;
}

export const PollCard: React.FC<PollCardProps> = ({
  id,
  title,
  status,
  totalResponses,
  createdAt,
  mode,
  slug,
  onStartSession,
  onShareLink,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: publish, isPending: isPublishing } = useMutation({
    mutationFn: () => publishPoll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });

  const statusColors = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    ended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  };

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "—";

  return (
    <Card className="group hover:shadow-md transition-all duration-300 border-border hover:border-primary/50 relative overflow-hidden flex flex-col h-full">
      {/* Decorative gradient blur */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="pb-3 flex-row justify-between items-start space-y-0">
        <div className="space-y-1 pr-4">
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColors[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              mode === "live"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800"
            }`}>
              {mode === "live" ? "🔴 Live" : "📊 Async"}
            </span>
          </div>
          <CardTitle className="text-xl line-clamp-2 leading-tight pt-2">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="-mr-3 -mt-2 h-8 w-8 text-muted-foreground hover:text-foreground shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="pb-4 grow">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center space-x-1.5">
            <BarChart3 className="h-4 w-4" />
            <span>{totalResponses} Responses</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 border-t border-border/50 bg-muted/20 mt-auto flex justify-between gap-2">
        {status === "active" ? (
          <>
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/polls/${id}`)}>
              View Results
            </Button>
            {mode === "live" && (
              <Button
                size="icon"
                className="shrink-0"
                title="Start Live Session"
                onClick={() => onStartSession?.(id)}
              >
                <Zap className="h-4 w-4" />
              </Button>
            )}
            {mode === "async" && (
              <Button
                size="icon"
                className="shrink-0"
                title="Share Poll Link"
                onClick={() => onShareLink?.(slug ?? id)}
                variant="outline"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : status === "draft" ? (
          <>
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/polls/${id}/edit`)}>
              Edit Poll
            </Button>
            <Button
              size="icon"
              className="shrink-0"
              title="Publish Poll"
              onClick={() => publish()}
              disabled={isPublishing}
            >
              <Play className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => navigate(`/polls/${id}`)}>
            View Final Results
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
