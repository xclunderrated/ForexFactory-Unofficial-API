import React from "react";
import { RefreshCw, Terminal, Calendar, Activity } from "lucide-react";

interface HeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
  activeTab: "calendar" | "api";
  onTabChange: (tab: "calendar" | "api") => void;
  latencyMs?: number;
  cached?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isLoading,
  onRefresh,
  activeTab,
  onTabChange,
  latencyMs,
  cached,
}) => {
  return (
    <header id="header-container" className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand Title & Real-time status */}
        <div id="brand-logo-section" className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                ForexFactory API
              </h1>
              <span id="live-status-badge" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live API
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              High-speed REST API & Economic Calendar Scraper
            </p>
          </div>
        </div>

        {/* Latency & View Switcher Tabs & Refresh */}
        <div className="flex items-center gap-2 sm:gap-3">
          {latencyMs !== undefined && !isLoading && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <Activity className="w-3 h-3 text-blue-500" />
              <span>{latencyMs}ms</span>
              {cached && (
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 rounded font-semibold">
                  CACHE
                </span>
              )}
            </div>
          )}

          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700">
            <button
              id="tab-btn-calendar"
              onClick={() => onTabChange("calendar")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "calendar"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
              id="tab-btn-api"
              onClick={() => onTabChange("api")}
              className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "api"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>API Docs & Builder</span>
            </button>
          </div>

          <button
            id="btn-header-refresh"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50 active:scale-95"
            title="Reload current date"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
