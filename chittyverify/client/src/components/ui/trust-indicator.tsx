import { cn } from "@/lib/utils";

interface TrustIndicatorProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function TrustIndicator({ score, size = "md", showLabel = false, className }: TrustIndicatorProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const getTrustColor = (score: number) => {
    if (score >= 90) return "trust-indicator"; // Gold
    if (score >= 75) return "bg-green-500"; // Green
    if (score >= 60) return "bg-yellow-500"; // Yellow
    return "bg-red-500"; // Red
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn(
        sizeClasses[size],
        getTrustColor(score),
        "rounded-full flex items-center justify-center font-bold text-white"
      )}>
        {score}
      </div>
      {showLabel && (
        <span className="text-sm text-gray-700">Trust Score</span>
      )}
    </div>
  );
}
