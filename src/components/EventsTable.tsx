import React, { useState } from "react";
import { ScrapedEvent } from "../types";
import { getImpactColor, getCurrencyFlag } from "../utils/formatters";
import { Info, ExternalLink, ArrowUpDown, ChevronDown, ChevronUp, Copy, Check, Sparkles } from "lucide-react";

interface EventsTableProps {
  events: ScrapedEvent[];
  isLoading: boolean;
  dateQueried: string;
}

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  isLoading,
  dateQueried,
}) => {
  const [sortField, setSortField] = useState<"time" | "currency" | "impact" | "title" | "actual">("time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSort = (field: "time" | "currency" | "impact" | "title" | "actual") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const copyEventJson = (e: ScrapedEvent, event: React.MouseEvent) => {
    event.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(e, null, 2));
    setCopiedId(e.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sortedEvents = [...events].sort((a, b) => {
    let comp = 0;
    if (sortField === "currency") {
      comp = a.currency.localeCompare(b.currency);
    } else if (sortField === "impact") {
      const scoreA = a.impactScore !== undefined ? a.impactScore : (a.impact === "High" ? 3 : a.impact === "Medium" ? 2 : a.impact === "Low" ? 1 : 0);
      const scoreB = b.impactScore !== undefined ? b.impactScore : (b.impact === "High" ? 3 : b.impact === "Medium" ? 2 : b.impact === "Low" ? 1 : 0);
      comp = scoreA - scoreB;
    } else if (sortField === "title") {
      comp = a.title.localeCompare(b.title);
    } else if (sortField === "actual") {
      comp = (a.actual || "").localeCompare(b.actual || "");
    } else {
      comp = a.time.localeCompare(b.time);
    }
    return sortOrder === "asc" ? comp : -comp;
  });

  if (isLoading) {
    return (
      <div id="table-skeleton-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs mb-5">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div id="empty-state-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-2xs mb-5">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
          <Info className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Calendar Events Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          No matching economic news events found for <strong>{dateQueried}</strong>. Try selecting a different date or adjusting your currency and impact filters above.
        </p>
      </div>
    );
  }

  return (
    <div id="table-container-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden mb-5 transition-colors">
      {/* Table Top Bar */}
      <div id="table-caption-bar" className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">ForexFactory Economic Releases</span>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
            {sortedEvents.length} events
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Click any row to view metadata & JSON</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table id="forex-events-table" className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/40 dark:bg-slate-800/20">
              <th
                id="th-time"
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => handleSort("time")}
              >
                <div className="flex items-center gap-1">
                  Time
                  <ArrowUpDown className={`w-3 h-3 ${sortField === "time" ? "text-blue-500" : "opacity-40"}`} />
                </div>
              </th>
              <th
                id="th-currency"
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => handleSort("currency")}
              >
                <div className="flex items-center gap-1">
                  Currency
                  <ArrowUpDown className={`w-3 h-3 ${sortField === "currency" ? "text-blue-500" : "opacity-40"}`} />
                </div>
              </th>
              <th
                id="th-impact"
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => handleSort("impact")}
              >
                <div className="flex items-center gap-1">
                  Impact
                  <ArrowUpDown className={`w-3 h-3 ${sortField === "impact" ? "text-blue-500" : "opacity-40"}`} />
                </div>
              </th>
              <th
                id="th-event"
                className="py-3 px-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => handleSort("title")}
              >
                <div className="flex items-center gap-1">
                  Event Title
                  <ArrowUpDown className={`w-3 h-3 ${sortField === "title" ? "text-blue-500" : "opacity-40"}`} />
                </div>
              </th>
              <th
                id="th-actual"
                className="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => handleSort("actual")}
              >
                <div className="flex items-center justify-end gap-1">
                  Actual
                  <ArrowUpDown className={`w-3 h-3 ${sortField === "actual" ? "text-blue-500" : "opacity-40"}`} />
                </div>
              </th>
              <th id="th-forecast" className="py-3 px-3.5 text-right">Forecast</th>
              <th id="th-previous" className="py-3 px-3.5 text-right">Previous</th>
              <th id="th-actions" className="py-3 px-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {sortedEvents.map((evt) => {
              const impactTheme = getImpactColor(evt.impact);
              const flag = getCurrencyFlag(evt.currency);
              const isExpanded = expandedEventId === evt.id;

              let actualBadgeClass = "text-slate-900 dark:text-white font-medium";
              if (evt.actualStatus === "better") {
                actualBadgeClass = "text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20";
              } else if (evt.actualStatus === "worse") {
                actualBadgeClass = "text-red-700 dark:text-red-300 font-bold bg-red-500/15 px-2 py-0.5 rounded-md border border-red-500/20";
              }

              return (
                <React.Fragment key={evt.id}>
                  <tr
                    id={`event-row-${evt.id}`}
                    onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                    className={`cursor-pointer transition-colors group ${
                      isExpanded
                        ? "bg-blue-50/50 dark:bg-slate-800/70"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Time */}
                    <td className="py-3 px-3.5 font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {evt.time || "All Day"}
                    </td>

                    {/* Currency */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span className="text-sm">{flag}</span>
                        <span>{evt.currency || "GLOBAL"}</span>
                      </span>
                    </td>

                    {/* Impact Badge */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5" title={`Attribute: "${evt.impactTitle}"`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${impactTheme.iconBg} shrink-0`} />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${impactTheme.bg} ${impactTheme.text} ${impactTheme.border}`}>
                          {evt.impact}
                        </span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-3.5 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="line-clamp-1">{evt.title}</span>
                        {evt.detailId && (
                          <a
                            href={`https://www.forexfactory.com/calendar?flex=true#detail=${evt.detailId}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            title="Open detail on ForexFactory"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Actual */}
                    <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                      <span className={actualBadgeClass}>
                        {evt.actual || "—"}
                      </span>
                    </td>

                    {/* Forecast */}
                    <td className="py-3 px-3.5 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {evt.forecast || "—"}
                    </td>

                    {/* Previous */}
                    <td className="py-3 px-3.5 text-right font-mono text-slate-500 dark:text-slate-500 whitespace-nowrap">
                      <span>{evt.previous || "—"}</span>
                      {evt.previousRevised && (
                        <span className="ml-1 text-[10px] text-amber-500 font-bold" title="Revised figure">
                          *
                        </span>
                      )}
                    </td>

                    {/* Expand Arrow */}
                    <td className="py-3 px-2 text-center text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto opacity-60" />}
                    </td>
                  </tr>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                      <td colSpan={8} className="p-4 sm:px-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* Event Meta Details */}
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                              Scraped Event Details
                            </h4>
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-500">Full Title:</span> {evt.title}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-500">Date & Time:</span> {evt.date} at {evt.time}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-500">Currency:</span> {evt.currency} ({flag})
                            </p>
                          </div>

                          {/* Impact & Rating Analysis */}
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                              Impact Rating & Attributes
                            </h4>
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-500">Impact Level:</span> {evt.impact}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-500">Raw Attribute:</span> "{evt.impactTitle}"
                            </p>
                            <p className="text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-500">Actual Outcome:</span>{" "}
                              <span className="capitalize font-semibold">{evt.actualStatus || "neutral"}</span>
                            </p>
                          </div>

                          {/* Actions & Links */}
                          <div className="space-y-2 flex flex-col justify-center">
                            <button
                              type="button"
                              onClick={(e) => copyEventJson(evt, e)}
                              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                            >
                              {copiedId === evt.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">Copied Event JSON</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Event JSON</span>
                                </>
                              )}
                            </button>

                            {evt.detailId && (
                              <a
                                href={`https://www.forexfactory.com/calendar?flex=true#detail=${evt.detailId}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-blue-500 transition-colors shadow-2xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>ForexFactory Detail Page</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
