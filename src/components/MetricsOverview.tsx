import React from "react";
import { ScrapedEvent } from "../types";
import { Layers, AlertCircle, DollarSign, CheckCircle2 } from "lucide-react";

interface MetricsOverviewProps {
  events: ScrapedEvent[];
  dateQueried: string;
  totalEventsFound: number;
  isLoading: boolean;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  events,
  totalEventsFound,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div id="metrics-skeleton" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/70 rounded-xl animate-pulse border border-slate-200 dark:border-slate-800" />
        ))}
      </div>
    );
  }

  const highImpactCount = events.filter((e) => e.impact === "High").length;
  const mediumImpactCount = events.filter((e) => e.impact === "Medium").length;
  const lowImpactCount = events.filter((e) => e.impact === "Low").length;
  
  // Real count of published actuals vs pending releases
  const publishedCount = events.filter((e) => e.actual && e.actual.trim() !== "" && e.actual.trim() !== "—").length;
  const pendingCount = events.length - publishedCount;

  const currencies = Array.from(new Set(events.map((e) => e.currency).filter(Boolean)));

  return (
    <div id="metrics-container" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <div id="metric-total-events" className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Scraped Events</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalEventsFound}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Layers className="w-4 h-4" />
        </div>
      </div>

      <div id="metric-high-impact" className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">High Impact (Red Folders)</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">{highImpactCount}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertCircle className="w-4 h-4" />
        </div>
      </div>

      <div id="metric-published-status" className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Released / Pending</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {publishedCount} <span className="text-xs font-normal text-slate-400">/ {pendingCount} pending</span>
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      <div id="metric-currencies" className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Currencies</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {currencies.length} <span className="text-xs font-normal text-slate-400">({mediumImpactCount}M / {lowImpactCount}L)</span>
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <DollarSign className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
