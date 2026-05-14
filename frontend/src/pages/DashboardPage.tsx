import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LayoutDashboard, Activity, Users, Radio, Globe, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import { PollCard } from "../components/Dashboard/PollCard";
import { Modal } from "../components/ui/Modal";
import { fetchPolls } from "../api/polls";
import { createSession } from "../api/sessions";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"live" | "async">("live");

  // Session Start Modal state
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startingPollId, setStartingPollId] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<{ id: string; room_code?: string; joinCode?: string } | null>(null);

  // Share Link Modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: polls = [], isLoading, error } = useQuery({
    queryKey: ["polls"],
    queryFn: fetchPolls,
  });

  const { mutate: doCreateSession, isPending: isCreatingSession } = useMutation({
    mutationFn: (pollId: string) => createSession(pollId),
    onSuccess: (data) => {
      setCreatedSession(data.session as any);
    },
  });

  const filteredPolls = polls.filter((poll) => poll.mode === activeTab);
  const totalActive = polls.filter((p) => p.status === "active").length;
  const totalResponses = polls.reduce((acc, curr) => acc + (curr.totalResponses || 0), 0);
  const totalPolls = polls.length;

  const handleStartSession = (pollId: string) => {
    setStartingPollId(pollId);
    setCreatedSession(null);
    setStartModalOpen(true);
    doCreateSession(pollId);
  };

  const handleShareLink = (slug: string) => {
    setShareSlug(slug);
    setCopied(false);
    setShareModalOpen(true);
  };

  const shareUrl = shareSlug ? `${window.location.origin}/poll/${shareSlug}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roomCode = createdSession?.room_code ?? createdSession?.joinCode;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            My Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage your polls and view real-time insights.</p>
        </div>
        <Button size="lg" className="shadow-primary/20 shadow-lg hover:shadow-primary/40 transition-shadow" onClick={() => navigate("/polls/create")}>
          <Plus className="mr-2 h-5 w-5" />
          Create New Poll
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-primary/10 text-primary rounded-lg"><Activity className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Polls</p>
            <h3 className="text-2xl font-bold">{totalActive}</h3>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg"><Users className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
            <h3 className="text-2xl font-bold">{totalResponses}</h3>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-6 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg"><LayoutDashboard className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Polls Created</p>
            <h3 className="text-2xl font-bold">{totalPolls}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border mb-6">
        <button onClick={() => setActiveTab("live")} className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === "live" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <div className="flex items-center gap-2"><Radio className="h-4 w-4" /> Live Polls</div>
        </button>
        <button onClick={() => setActiveTab("async")} className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === "async" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> Async Surveys</div>
        </button>
      </div>

      {/* Polls Grid */}
      <div>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-red-500 py-10 text-center">Failed to load polls.</div>
        ) : filteredPolls.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
            No {activeTab} polls found. Create one to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                id={poll.id}
                title={poll.title}
                status={poll.status}
                totalResponses={poll.totalResponses}
                createdAt={poll.createdAt ?? poll.created_at ?? ""}
                mode={poll.mode}
                slug={poll.slug}
                onStartSession={handleStartSession}
                onShareLink={handleShareLink}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Session Start Modal ── */}
      <Modal
        isOpen={startModalOpen}
        onClose={() => { setStartModalOpen(false); setCreatedSession(null); }}
        title="Session Started 🎉"
      >
        <div className="space-y-5">
          {isCreatingSession ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Creating session…</p>
            </div>
          ) : roomCode ? (
            <>
              <p className="text-sm text-muted-foreground">Share this room code with your audience:</p>
              <div className="text-center py-6 bg-primary/5 rounded-xl border border-primary/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Room Code</p>
                <p className="text-5xl font-black tracking-[0.2em] text-primary font-mono">{roomCode}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Audience joins at <span className="font-mono font-medium">{window.location.origin}/join/{roomCode}</span>
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStartModalOpen(false)}>
                  Stay Here
                </Button>
                <Button
                  className="flex-1 gap-2 shadow-md shadow-primary/20"
                  onClick={() => {
                    setStartModalOpen(false);
                    navigate(`/present/${createdSession?.id}?code=${roomCode}&pollId=${startingPollId}`);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to Presenter View
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500">Failed to create session. Please try again.</p>
          )}
        </div>
      </Modal>

      {/* ── Share Link Modal ── */}
      <Modal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share Poll Link"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Anyone with this link can respond to your poll:</p>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5 border border-border">
            <span className="flex-1 text-sm font-mono truncate text-foreground">{shareUrl}</span>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2"
              onClick={handleCopy}
              variant={copied ? "outline" : "primary"}
            >
              {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button variant="outline" onClick={() => window.open(shareUrl, "_blank")} className="gap-2">
              <ExternalLink className="h-4 w-4" /> Open
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
