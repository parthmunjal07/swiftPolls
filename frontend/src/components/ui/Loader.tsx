import React from "react";
import { cn } from "../../lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = "md", className, text }) => {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          sizes[size]
        )}
      />
      {text && <p className="text-sm font-medium text-muted-foreground">{text}</p>}
    </div>
  );
};

export const FullPageLoader: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <Loader size="lg" text={text || "Loading SwiftPolls..."} />
    </div>
  );
};
