import React from "react";
import { zxcvbn } from "zxcvbn-ts";
import { cn } from "@/src/lib/utils";

interface StrengthIndicatorProps {
  password: string;
}

export function StrengthIndicator({ password }: StrengthIndicatorProps) {
  const result = zxcvbn(password);
  const score = password ? result.score : -1; // -1 for empty

  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1 h-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-all duration-500",
              i <= score ? colors[score] : "bg-gray-100"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-mono">
        <span className={cn(
          "transition-colors duration-300",
          password ? "text-gray-500" : "text-gray-300"
        )}>
          {password ? `Strength: ${labels[score]}` : "Enter password to check strength"}
        </span>
        {password && result.feedback.warning && (
          <span className="text-red-400 italic lowercase">
            {result.feedback.warning}
          </span>
        )}
      </div>
    </div>
  );
}
