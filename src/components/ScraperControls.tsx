import React from "react";
import { Calendar, Search, Filter, RefreshCw, ArrowRight, FileText, FileJson, ChevronLeft, ChevronRight, X, CheckCheck } from "lucide-react";
import { ImpactLevel, ScrapedEvent } from "../types";

interface ScraperControlsProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onScrape: () => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedImpacts: ImpactLevel[];
  onToggleImpact: (impact: ImpactLevel) => void;
  selectedCurrencies: string[];
  onToggleCurrency: (curr: string) => void;
  onSelectAllCurrencies: () => void;
  onClearCurrencies: () => void;
  onSelectMajorCurrencies: () => void;
  hasActualFilter: boolean;
  onToggleHasActualFilter: () => void;
  filteredEvents: ScrapedEvent[];
  totalEventsCount: number;
}

const ALL_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"];
const ALL_IMPACTS: ImpactLevel[] = ["High", "Medium", "Low", "Non-Economic"];

export const ScraperControls: React.FC<ScraperControlsProps> = ({
  selectedDate,
  onDateChange,
  onScrape,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedImpacts,
  onToggleImpact,
  selectedCurrencies,
  onToggleCurrency,
  onSelectAllCurrencies,
  onClearCurrencies,
  onSelectMajorCurrencies,
  hasActualFilter,
  onToggleHasActualFilter,
  filteredEvents,
  totalEventsCount,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayObj = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayObj.toISOString().split("T")[0];
  const tomorrowObj = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrowObj.toISOString().split("T")[0];

  // Helper to step date forward/backward by 1 day
  const stepDate = (deltaDays: number) => {
    let base = new Date();
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        base = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      }
    }
    base.setUTCDate(base.getUTCDate() + deltaDays);
    const newDateStr = base.toISOString().split("T")[0];
    onDateChange(newDateStr);
  };

  const exportCsv = () => {
    if (filteredEvents.length === 0) return;
    const headers = ["Date", "Time", "Currency", "Impact", "ImpactScore", "ImpactTitle", "Title", "Actual", "Forecast", "Previous", "ActualStatus", "Revised"];
    const rows = filteredEvents.map((e) => [
      `"${e.date}"`,
      `"${e.time}"`,
      `"${e.currency}"`,
      `"${e.impact}"`,
      `"${e.impactScore || 0}"`,
      `"${e.impactTitle}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.actual}"`,
      `"${e.forecast}"`,
      `"${e.previous}"`,
      `"${e.actualStatus || "neutral"}"`,
      `"${e.previousRevised ? "true" : "false"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `forexfactory_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportJson = () => {
    if (filteredEvents.length === 0) return;
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `forexfactory_${selectedDate}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div id="controls-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs mb-5 space-y-4 transition-colors">
      {/* Date & Trigger Row */}
      <div id="date-selection-bar" className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Stepper + Date Input */}
          <div className="flex items-center gap-1">
            <button
              id="btn-prev-day"
              type="button"
              onClick={() => stepDate(-1)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-blue-500 pointer-events-none" />
              <input
                id="input-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <button
              id="btn-next-day"
              type="button"
              onClick={() => stepDate(1)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div id="date-presets-group" className="flex items-center gap-1 flex-wrap">
            <button
              id="preset-today"
              type="button"
              onClick={() => onDateChange(todayStr)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                selectedDate === todayStr
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Today
            </button>
            <button
              id="preset-yesterday"
              type="button"
              onClick={() => onDateChange(yesterdayStr)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                selectedDate === yesterdayStr
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Yesterday
            </button>
            <button
              id="preset-tomorrow"
              type="button"
              onClick={() => onDateChange(tomorrowStr)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                selectedDate === tomorrowStr
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Tomorrow
            </button>
            <button
              id="preset-may15-2024"
              type="button"
              onClick={() => onDateChange("2024-05-15")}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors hidden sm:inline ${
                selectedDate === "2024-05-15"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              May 15, 2024
            </button>
            <button
              id="preset-oct14-2014"
              type="button"
              onClick={() => onDateChange("2014-10-14")}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors hidden md:inline ${
                selectedDate === "2014-10-14"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Oct 14, 2014
            </button>
          </div>
        </div>

        {/* Action Trigger & Exports */}
        <div className="flex items-center gap-2">
          <button
            id="btn-scrape-trigger"
            type="button"
            onClick={onScrape}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-xs disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scraping...</span>
              </>
            ) : (
              <>
                <span>Fetch Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Quick Direct Exports */}
          <button
            id="btn-export-csv"
            type="button"
            onClick={exportCsv}
            disabled={filteredEvents.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-40"
            title="Download CSV"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            id="btn-export-json"
            type="button"
            onClick={exportJson}
            disabled={filteredEvents.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-40"
            title="Download JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Search, Status & Impact Filter Row */}
      <div id="search-filter-section" className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div id="search-input-wrapper" className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            id="input-search-query"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search event name, currency, or impact..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group: Impact & Released only */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Has Actual Toggle */}
          <button
            type="button"
            id="btn-filter-actual-only"
            onClick={onToggleHasActualFilter}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all border ${
              hasActualFilter
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200"
            }`}
          >
            <CheckCheck className="w-3 h-3 text-emerald-500" />
            <span>Released Only</span>
          </button>

          {/* Impact Level Filters */}
          <div id="impact-filters-group" className="flex items-center gap-1 flex-wrap pl-1 border-l border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Impact:
            </span>
            {ALL_IMPACTS.map((imp) => {
              const isSelected = selectedImpacts.includes(imp);
              let badgeStyle = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200";
              if (isSelected) {
                if (imp === "High") badgeStyle = "bg-red-500 text-white font-bold shadow-2xs";
                else if (imp === "Medium") badgeStyle = "bg-amber-500 text-white font-bold shadow-2xs";
                else if (imp === "Low") badgeStyle = "bg-yellow-500 text-slate-900 font-bold shadow-2xs";
                else badgeStyle = "bg-slate-700 text-white font-bold shadow-2xs";
              }
              return (
                <button
                  key={imp}
                  type="button"
                  id={`filter-impact-${imp.toLowerCase()}`}
                  onClick={() => onToggleImpact(imp)}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${badgeStyle}`}
                >
                  {imp === "Non-Economic" ? "Holiday/Non-Econ" : imp}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Currency Filter Bar with Quick Actions */}
      <div id="currency-filters-group" className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">Currencies:</span>
          {ALL_CURRENCIES.map((curr) => {
            const isSelected = selectedCurrencies.includes(curr);
            return (
              <button
                key={curr}
                type="button"
                id={`filter-curr-${curr.toLowerCase()}`}
                onClick={() => onToggleCurrency(curr)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {curr}
              </button>
            );
          })}
        </div>

        {/* Currency Quick Selectors */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={onSelectMajorCurrencies}
            className="px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Majors (G8)
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            type="button"
            onClick={onSelectAllCurrencies}
            className="px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            All
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            type="button"
            onClick={onClearCurrencies}
            className="px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
