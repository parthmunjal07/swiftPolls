import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { BarChart3, Users, Zap, ArrowRight } from "lucide-react";

export const LandingPage: React.FC = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/live/${roomCode.trim()}`);
    }
  };

  return (
    <div className="flex flex-col gap-20 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto px-4">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-sans text-foreground">
            Real-time Polling <br />
            <span className="text-primary">Made Simple.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Engage your audience instantly with SwiftPolls. Create live sessions, 
            gather feedback, and visualize results in real-time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/signup">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg">
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <div className="w-full sm:w-auto">
            <form onSubmit={handleJoin} className="flex gap-2">
              <Input
                placeholder="Enter Room Code"
                className="h-14 w-full sm:w-48"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <Button type="submit" variant="outline" size="lg" className="h-14">
                Join
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <FeatureCard
          icon={<Zap className="text-primary" size={24} />}
          title="Instant Feedback"
          description="See responses update live as they come in. No refreshing needed."
        />
        <FeatureCard
          icon={<Users className="text-primary" size={24} />}
          title="Seamless Interaction"
          description="Participants can join with a simple room code from any device."
        />
        <FeatureCard
          icon={<BarChart3 className="text-primary" size={24} />}
          title="Beautiful Analytics"
          description="Visualize results with stunning, interactive charts and data insights."
        />
      </section>

      {/* Social Proof/CTA Section */}
      <section className="bg-muted rounded-3xl p-12 text-center space-y-8 mx-4">
        <h2 className="text-3xl font-bold">Ready to engage your audience?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Join thousands of creators using SwiftPolls for meetings, classrooms, and events.
        </p>
        <Link to="/signup">
          <Button size="lg" variant="primary">
            Create Your First Poll
          </Button>
        </Link>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <Card className="hover:border-primary/50 transition-colors border-2">
    <CardContent className="pt-6 space-y-4">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </CardContent>
  </Card>
);
