import { ImpactLevel } from "../types";

export function getImpactColor(impact: ImpactLevel): {
  bg: string;
  text: string;
  border: string;
  iconBg: string;
  dotColor: string;
} {
  switch (impact) {
    case "High":
      return {
        bg: "bg-red-500/10 dark:bg-red-950/30",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-200 dark:border-red-900/40",
        iconBg: "bg-red-500",
        dotColor: "#ef4444",
      };
    case "Medium":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-950/30",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-900/40",
        iconBg: "bg-amber-500",
        dotColor: "#f59e0b",
      };
    case "Low":
      return {
        bg: "bg-yellow-500/10 dark:bg-yellow-950/30",
        text: "text-yellow-700 dark:text-yellow-400",
        border: "border-yellow-200 dark:border-yellow-900/40",
        iconBg: "bg-yellow-400",
        dotColor: "#eab308",
      };
    case "Non-Economic":
    default:
      return {
        bg: "bg-slate-500/10 dark:bg-slate-800/40",
        text: "text-slate-600 dark:text-slate-400",
        border: "border-slate-200 dark:border-slate-700/50",
        iconBg: "bg-slate-400",
        dotColor: "#94a3b8",
      };
  }
}

export function getCurrencyFlag(currency: string): string {
  const flags: Record<string, string> = {
    USD: "🇺🇸",
    EUR: "🇪🇺",
    GBP: "🇬🇧",
    JPY: "🇯🇵",
    AUD: "🇦🇺",
    CAD: "🇨🇦",
    CHF: "🇨🇭",
    NZD: "🇳🇿",
    CNY: "🇨🇳",
  };
  return flags[currency.toUpperCase()] || "🌐";
}
