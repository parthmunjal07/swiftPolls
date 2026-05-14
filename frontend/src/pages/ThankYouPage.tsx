import { useNavigate } from "react-router-dom";
import { CheckCircle2, BarChart3, Home } from "lucide-react";
import { Button } from "../components/ui/Button";

interface ThankYouPageProps {
  pollSlug?: string;
  pollTitle?: string;
  showResults?: boolean;
}

export const ThankYouPage = ({
  pollSlug,
  pollTitle,
  showResults = false,
}: ThankYouPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Animated check */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" />
          <div className="absolute inset-0 rounded-full bg-primary/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle2 className="h-14 w-14 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Response Submitted!
          </h1>
          {pollTitle && (
            <p className="text-muted-foreground text-lg font-medium">
              {pollTitle}
            </p>
          )}
          <p className="text-muted-foreground">
            Thank you for participating. Your response has been recorded.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showResults && pollSlug && (
            <Button
              size="lg"
              onClick={() => navigate(`/poll/${pollSlug}`)}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <BarChart3 className="h-5 w-5" />
              View Results
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="h-5 w-5" />
            Go Home
          </Button>
        </div>

        {/* Decorative dots */}
        <div className="flex justify-center gap-2 pt-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/30"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
