import React, { useState, useEffect } from "react";
import { Terminal, Copy, Check, Play, BookOpen, Code, Server, FileJson } from "lucide-react";
import { ImpactLevel } from "../types";

interface ApiPlaygroundProps {
  selectedDate: string;
  selectedCurrencies: string[];
  selectedImpacts: ImpactLevel[];
}

export const ApiPlayground: React.FC<ApiPlaygroundProps> = ({
  selectedDate,
  selectedCurrencies,
  selectedImpacts,
}) => {
  const [paramDate, setParamDate] = useState<string>(selectedDate || "today");
  const [paramCurrencies, setParamCurrencies] = useState<string>(selectedCurrencies.join(","));
  const [paramImpacts, setParamImpacts] = useState<string>(
    selectedImpacts.length >= 4 ? "" : selectedImpacts.join(",")
  );
  const [paramSearch, setParamSearch] = useState<string>("");
  const [paramHasActual, setParamHasActual] = useState<boolean>(false);
  const [paramSort, setParamSort] = useState<string>("time");
  const [paramFormat, setParamFormat] = useState<"json" | "csv">("json");

  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "javascript" | "python" | "sheets" | "excel" | "mql5">("curl");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatency, setResponseLatency] = useState<number | null>(null);
  const [isCachedResponse, setIsCachedResponse] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync props if changed
  useEffect(() => {
    if (selectedDate) setParamDate(selectedDate);
  }, [selectedDate]);

  // Construct query string
  const queryParams = new URLSearchParams();
  if (paramDate) queryParams.set("date", paramDate);
  if (paramCurrencies.trim()) queryParams.set("currency", paramCurrencies.trim());
  if (paramImpacts.trim()) queryParams.set("impact", paramImpacts.trim());
  if (paramSearch.trim()) queryParams.set("search", paramSearch.trim());
  if (paramHasActual) queryParams.set("hasActual", "true");
  if (paramSort && paramSort !== "time") queryParams.set("sort", paramSort);
  if (paramFormat === "csv") queryParams.set("format", "csv");

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const endpointPath = `/api/v1/calendar${queryString}`;
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${endpointPath}` : endpointPath;

  // Execute test request
  const handleTestRequest = async () => {
    setIsExecuting(true);
    setApiResponse(null);
    setResponseStatus(null);
    setIsCachedResponse(false);
    const start = performance.now();

    try {
      const res = await fetch(endpointPath);
      const latency = Math.round(performance.now() - start);
      setResponseStatus(res.status);
      setResponseLatency(latency);

      if (paramFormat === "csv") {
        const text = await res.text();
        setApiResponse(text);
      } else {
        const data = await res.json();
        if (data.cached) {
          setIsCachedResponse(true);
        }
        setApiResponse(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setResponseStatus(500);
      setApiResponse(JSON.stringify({ error: err.message || "Failed to execute API request" }, null, 2));
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Code snippet generators
  const getCurlSnippet = () => {
    if (paramFormat === "csv") {
      return `curl -X GET "${fullUrl}" \\\n  -H "Accept: text/csv" \\\n  -o forexfactory_calendar.csv`;
    }
    return `curl -X GET "${fullUrl}" \\\n  -H "Accept: application/json"`;
  };

  const getJsSnippet = () => {
    return `// JavaScript / TypeScript Fetch Example
async function fetchEconomicCalendar() {
  const response = await fetch("${fullUrl}");
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  ${
    paramFormat === "csv"
      ? `const csvContent = await response.text();
  console.log("CSV Data:", csvContent);
  return csvContent;`
      : `const data = await response.json();
  console.log(\`Found \${data.totalEventsFound} events for \${data.dateQueried}\`);
  console.table(data.events.map(e => ({
    time: e.time,
    currency: e.currency,
    impact: e.impact,
    event: e.title,
    actual: e.actual,
    forecast: e.forecast
  })));
  return data;`
  }
}

fetchEconomicCalendar();`;
  };

  const getPythonSnippet = () => {
    return `# Python Requests Example
import requests

url = "${fullUrl}"
headers = {"Accept": "${paramFormat === "csv" ? "text/csv" : "application/json"}"}

response = requests.get(url, headers=headers)
response.raise_for_status()

${
  paramFormat === "csv"
    ? `csv_data = response.text
print(csv_data)`
    : `data = response.json()
print(f"Total events found: {data.get('totalEventsFound')}")
for event in data.get('events', []):
    print(f"[{event['time']}] {event['currency']} | {event['impact']} | {event['title']} | Act: {event['actual']} | Fcst: {event['forecast']}")`
}`;
  };

  const getSheetsSnippet = () => {
    const csvUrl = typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/calendar?date=${paramDate || "today"}&format=csv`
      : `/api/v1/calendar?date=${paramDate || "today"}&format=csv`;

    return `=IMPORTDATA("${csvUrl}")

// How to import into Google Sheets:
// 1. Open your Google Sheet
// 2. Select cell A1
// 3. Paste the formula above and press Enter
// 4. Real-time ForexFactory news calendar populates automatically!`;
  };

  const getExcelSnippet = () => {
    const csvUrl = typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/calendar?date=${paramDate || "today"}&format=csv`
      : `/api/v1/calendar?date=${paramDate || "today"}&format=csv`;

    return `URL: ${csvUrl}

// How to import into Microsoft Excel (Power Query):
// 1. Open Excel -> Click "Data" tab
// 2. Choose "From Web" / "From Text/CSV"
// 3. Paste the URL above -> Click "OK" / "Load"
// 4. Excel pulls live ForexFactory releases directly into your workbook!`;
  };

  const getMql5Snippet = () => {
    return `// MQL4 / MQL5 WebRequest Example
string url = "${fullUrl}";
char postData[];
char result[];
string resultHeaders;

int res = WebRequest("GET", url, "Accept: application/json", 5000, postData, result, resultHeaders);
if(res == 200) {
   string responseText = CharArrayToString(result);
   Print("ForexFactory Calendar Data Received: ", responseText);
} else {
   Print("WebRequest failed with error: ", GetLastError());
}`;
  };

  const getActiveSnippet = () => {
    if (activeCodeTab === "curl") return getCurlSnippet();
    if (activeCodeTab === "javascript") return getJsSnippet();
    if (activeCodeTab === "python") return getPythonSnippet();
    if (activeCodeTab === "sheets") return getSheetsSnippet();
    if (activeCodeTab === "excel") return getExcelSnippet();
    return getMql5Snippet();
  };

  return (
    <div id="api-playground-root" className="space-y-6">
      {/* Intro Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-5 h-5 text-blue-200" />
            <h2 className="text-lg font-bold tracking-tight">ForexFactory REST API & Integration Suite</h2>
          </div>
          <p className="text-xs text-blue-100 max-w-2xl">
            Production-grade JSON & CSV endpoints for ForexFactory economic calendar data. Includes built-in caching, impact classification, and ready-to-use snippets for Python, Node.js, Google Sheets, and Excel.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/api/v1/spec"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white backdrop-blur-xs transition-colors border border-white/20 flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            OpenAPI 3.0 Spec
          </a>
        </div>
      </div>

      {/* Interactive Request Builder */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-500" />
            Interactive Endpoint Configurator
          </h3>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
            GET /api/v1/calendar
          </span>
        </div>

        {/* Preset Shortcuts */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
            Quick Request Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setParamDate("today");
                setParamCurrencies("");
                setParamImpacts("");
                setParamSearch("");
                setParamHasActual(false);
                setParamFormat("json");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Today's Full Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setParamDate("today");
                setParamCurrencies("");
                setParamImpacts("High");
                setParamSearch("");
                setParamHasActual(false);
                setParamFormat("json");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-red-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Today's High-Impact (Red Folders)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setParamDate("2024-05-15");
                setParamCurrencies("USD,EUR,GBP");
                setParamImpacts("High,Medium");
                setParamSearch("");
                setParamHasActual(false);
                setParamFormat("json");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>May 15, 2024 (USD, EUR, GBP)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setParamDate("2014-10-14");
                setParamCurrencies("");
                setParamImpacts("");
                setParamSearch("");
                setParamHasActual(false);
                setParamFormat("json");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Oct 14, 2014 Historical (18 Events)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setParamDate("today");
                setParamCurrencies("");
                setParamImpacts("");
                setParamSearch("");
                setParamHasActual(false);
                setParamFormat("csv");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>CSV Spreadsheet Format</span>
            </button>
          </div>
        </div>

        {/* Query Parameter Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              date <span className="text-slate-400 font-normal">(YYYY-MM-DD or today)</span>
            </label>
            <input
              type="text"
              value={paramDate}
              onChange={(e) => setParamDate(e.target.value)}
              placeholder="today, yesterday, 2024-05-15"
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              currency <span className="text-slate-400 font-normal">(e.g. USD,EUR,GBP)</span>
            </label>
            <input
              type="text"
              value={paramCurrencies}
              onChange={(e) => setParamCurrencies(e.target.value)}
              placeholder="USD,EUR,GBP"
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              impact <span className="text-slate-400 font-normal">(e.g. High,Medium)</span>
            </label>
            <input
              type="text"
              value={paramImpacts}
              onChange={(e) => setParamImpacts(e.target.value)}
              placeholder="High,Medium,Low"
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              format
            </label>
            <select
              value={paramFormat}
              onChange={(e) => setParamFormat(e.target.value as "json" | "csv")}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="json">json (Structured JSON)</option>
              <option value="csv">csv (Spreadsheet CSV)</option>
            </select>
          </div>
        </div>

        {/* Optional Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              search <span className="text-slate-400 font-normal">(keyword)</span>
            </label>
            <input
              type="text"
              value={paramSearch}
              onChange={(e) => setParamSearch(e.target.value)}
              placeholder="CPI, Payroll, GDP..."
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              sort field
            </label>
            <select
              value={paramSort}
              onChange={(e) => setParamSort(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="time">time (Chronological)</option>
              <option value="impact">impact (Highest First)</option>
              <option value="currency">currency (Alphabetical)</option>
              <option value="actual">actual (Released values)</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer w-full text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={paramHasActual}
                onChange={(e) => setParamHasActual(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>hasActual (Released Only)</span>
            </label>
          </div>
        </div>

        {/* Live Endpoint URL Preview Bar */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto text-emerald-400">
            <span className="font-bold text-blue-400 shrink-0">GET</span>
            <span className="truncate">{endpointPath}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => copyToClipboard(`=IMPORTDATA("${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/calendar?date=${paramDate || "today"}&format=csv")`, "gsheets")}
              className="px-2.5 py-1 rounded-md bg-emerald-950/80 hover:bg-emerald-900 text-[11px] font-bold text-emerald-300 flex items-center gap-1 transition-colors border border-emerald-800"
              title="Copy =IMPORTDATA formula for Google Sheets"
            >
              {copiedKey === "gsheets" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied Sheets Formula</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-emerald-400" />
                  <span>Copy Sheets Formula</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => copyToClipboard(fullUrl, "endpoint")}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center gap-1 transition-colors border border-slate-700"
            >
              {copiedKey === "endpoint" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Full URL</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestRequest}
              disabled={isExecuting}
              className="px-3.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-60 shadow-xs"
            >
              <Play className={`w-3 h-3 ${isExecuting ? "animate-spin" : ""}`} />
              <span>Send Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Snippets & Response Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Code Snippet Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Integration Snippets</h3>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {(["curl", "javascript", "python", "sheets", "excel", "mql5"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCodeTab(tab)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                    activeCodeTab === tab
                      ? "bg-blue-600 text-white shadow-2xs font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {tab === "curl"
                    ? "cURL"
                    : tab === "javascript"
                    ? "JS / Node"
                    : tab === "python"
                    ? "Python"
                    : tab === "sheets"
                    ? "Sheets"
                    : tab === "excel"
                    ? "Excel"
                    : "MQL5"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => copyToClipboard(getActiveSnippet(), "code")}
              className="absolute right-2.5 top-2.5 px-2 py-1 rounded text-[11px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1 border border-slate-700 transition-colors z-10"
            >
              {copiedKey === "code" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>

            <div className="bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-xl border border-slate-800 h-full overflow-x-auto min-h-[220px]">
              <pre className="whitespace-pre-wrap">{getActiveSnippet()}</pre>
            </div>
          </div>
        </div>

        {/* Live Response Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Live API Response Preview</h3>
            </div>

            {responseStatus !== null && (
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className={`px-2 py-0.5 rounded font-bold ${responseStatus === 200 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
                  HTTP {responseStatus}
                </span>
                {responseLatency !== null && (
                  <span className="text-slate-400">{responseLatency}ms</span>
                )}
                {isCachedResponse && (
                  <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-blue-500/20">
                    CACHED
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="relative flex-1">
            {apiResponse && (
              <button
                type="button"
                onClick={() => copyToClipboard(apiResponse, "response")}
                className="absolute right-2.5 top-2.5 px-2 py-1 rounded text-[11px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1 border border-slate-700 transition-colors z-10"
              >
                {copiedKey === "response" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Response</span>
                  </>
                )}
              </button>
            )}

            <div className="bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-xl border border-slate-800 h-full overflow-x-auto min-h-[220px] max-h-[340px]">
              {isExecuting ? (
                <div className="h-full flex items-center justify-center text-slate-500 py-14">
                  <span className="animate-pulse">Fetching live data from ForexFactory...</span>
                </div>
              ) : apiResponse ? (
                <pre className="whitespace-pre-wrap">{apiResponse}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-14 text-center space-y-1">
                  <Play className="w-6 h-6 text-slate-600 mb-1" />
                  <p className="text-xs">Click <strong>"Send Request"</strong> above to execute a real-time request.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* REST Endpoints Reference Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Available REST Endpoints
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 pb-2">
                <th className="py-2.5 px-3 font-bold">Method</th>
                <th className="py-2.5 px-3 font-bold">Endpoint Path</th>
                <th className="py-2.5 px-3 font-bold">Supported Parameters</th>
                <th className="py-2.5 px-3 font-bold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              <tr>
                <td className="py-2.5 px-3 text-blue-600 font-bold">GET</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">/api/v1/calendar</td>
                <td className="py-2.5 px-3 text-slate-500">date, currency, impact, search, hasActual, sort, format</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">Full calendar scraper with complete filtering and CSV output</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-600 font-bold">GET</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">/api/v1/today</td>
                <td className="py-2.5 px-3 text-slate-500">currency, impact, format</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">Quick shortcut for today's economic releases</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-600 font-bold">GET</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">/api/v1/high-impact</td>
                <td className="py-2.5 px-3 text-slate-500">date, currency, format</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">Returns only high-impact (red folder) market moving events</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-600 font-bold">GET</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">/api/v1/currencies</td>
                <td className="py-2.5 px-3 text-slate-500">—</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">List active currencies and major G8 pairs</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-600 font-bold">GET</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">/api/v1/metrics</td>
                <td className="py-2.5 px-3 text-slate-500">—</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">Real-time cache hit ratios, request counts, and uptime stats</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-blue-600 font-bold">GET</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">/api/v1/spec</td>
                <td className="py-2.5 px-3 text-slate-500">—</td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">OpenAPI 3.0 specification document</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
