import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { MetricsOverview } from "./components/MetricsOverview";
import { ScraperControls } from "./components/ScraperControls";
import { EventsTable } from "./components/EventsTable";
import { ApiPlayground } from "./components/ApiPlayground";
import { ScrapedEvent, ScrapeResult, ImpactLevel } from "./types";
import { CheckCircle2, Server } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"calendar" | "api">("calendar");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedImpacts, setSelectedImpacts] = useState<ImpactLevel[]>([
    "High",
    "Medium",
    "Low",
    "Non-Economic",
  ]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [hasActualFilter, setHasActualFilter] = useState<boolean>(false);

  // Scrape handler
  const handleScrape = useCallback(async (dateToScrape?: string) => {
    const target = dateToScrape || selectedDate;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/scrape?date=${encodeURIComponent(target)}`);
      if (!res.ok) {
        throw new Error(`Scraper API returned HTTP ${res.status}`);
      }
      const data: ScrapeResult = await res.json();
      setScrapeResult(data);
    } catch (err: any) {
      console.warn("Scrape request fallback notice:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Initial scrape on load
  useEffect(() => {
    const initialDate = new Date().toISOString().split("T")[0];
    handleScrape(initialDate);
  }, []);

  // Filter events in client memory for instant interaction
  const events = scrapeResult?.events || [];
  const filteredEvents = events.filter((evt) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchCurr = evt.currency.toLowerCase().includes(q);
      const matchImpact = evt.impact.toLowerCase().includes(q);
      if (!matchTitle && !matchCurr && !matchImpact) return false;
    }

    if (selectedImpacts.length > 0 && !selectedImpacts.includes(evt.impact)) {
      return false;
    }

    if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(evt.currency)) {
      return false;
    }

    if (hasActualFilter) {
      if (!evt.actual || evt.actual.trim() === "" || evt.actual.trim() === "—") {
        return false;
      }
    }

    return true;
  });

  const handleToggleImpact = (impact: ImpactLevel) => {
    if (selectedImpacts.includes(impact)) {
      if (selectedImpacts.length > 1) {
        setSelectedImpacts(selectedImpacts.filter((i) => i !== impact));
      }
    } else {
      setSelectedImpacts([...selectedImpacts, impact]);
    }
  };

  const handleToggleCurrency = (curr: string) => {
    if (selectedCurrencies.includes(curr)) {
      setSelectedCurrencies(selectedCurrencies.filter((c) => c !== curr));
    } else {
      setSelectedCurrencies([...selectedCurrencies, curr]);
    }
  };

  const handleSelectAllCurrencies = () => {
    const all = Array.from(new Set(events.map((e) => e.currency).filter(Boolean)));
    setSelectedCurrencies(all.length > 0 ? all : ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"]);
  };

  const handleClearCurrencies = () => {
    setSelectedCurrencies([]);
  };

  const handleSelectMajorCurrencies = () => {
    setSelectedCurrencies(["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      {/* Header */}
      <Header
        isLoading={isLoading}
        onRefresh={() => handleScrape(selectedDate)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        latencyMs={scrapeResult?.latencyMs}
        cached={scrapeResult?.cached}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "api" ? (
          <ApiPlayground
            selectedDate={selectedDate}
            selectedCurrencies={selectedCurrencies}
            selectedImpacts={selectedImpacts}
          />
        ) : (
          <>
            {/* Scraper Controls */}
            <ScraperControls
              selectedDate={selectedDate}
              onDateChange={(d) => {
                setSelectedDate(d);
                handleScrape(d);
              }}
              onScrape={() => handleScrape(selectedDate)}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedImpacts={selectedImpacts}
              onToggleImpact={handleToggleImpact}
              selectedCurrencies={selectedCurrencies}
              onToggleCurrency={handleToggleCurrency}
              onSelectAllCurrencies={handleSelectAllCurrencies}
              onClearCurrencies={handleClearCurrencies}
              onSelectMajorCurrencies={handleSelectMajorCurrencies}
              hasActualFilter={hasActualFilter}
              onToggleHasActualFilter={() => setHasActualFilter((prev) => !prev)}
              filteredEvents={filteredEvents}
              totalEventsCount={events.length}
            />

            {/* Scrape Info & Engine status line */}
            {scrapeResult && !isLoading && (
              <div id="scrape-info-banner" className="mb-3 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Loaded {scrapeResult.totalEventsFound} events for <strong>{scrapeResult.dateQueried}</strong></span>
                  </span>
                  {scrapeResult.scraperEngine && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      <Server className="w-3 h-3" />
                      {scrapeResult.scraperEngine}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-mono">{scrapeResult.latencyMs}ms</span>
                  <span>•</span>
                  <a
                    href={scrapeResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-500 underline truncate max-w-xs"
                    title={scrapeResult.url}
                  >
                    ForexFactory Target URL
                  </a>
                </div>
              </div>
            )}

            {/* Metrics Overview */}
            <MetricsOverview
              events={events}
              dateQueried={scrapeResult?.dateQueried || selectedDate}
              totalEventsFound={scrapeResult?.totalEventsFound || 0}
              isLoading={isLoading}
            />

            {/* Events Data Table */}
            <EventsTable
              events={filteredEvents}
              isLoading={isLoading}
              dateQueried={scrapeResult?.dateQueried || selectedDate}
            />
          </>
        )}
      </main>
    </div>
  );
}
