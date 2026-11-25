import express, { Request, Response, NextFunction } from "express";
import path from "path";
import * as cheerio from "cheerio";

type ImpactLevel = "High" | "Medium" | "Low" | "Non-Economic" | "Unknown";

interface ScrapedEvent {
  id: string;
  date: string;
  time: string;
  currency: string;
  impact: ImpactLevel;
  impactTitle: string;
  impactClass: string;
  title: string;
  detailId?: string;
  actual: string;
  forecast: string;
  previous: string;
  previousRevised?: boolean;
  actualStatus?: "better" | "worse" | "neutral";
  rawRowData?: string[];
  impactScore?: number;
}

interface ScrapeResult {
  url: string;
  dateQueried: string;
  timestamp: string;
  totalEventsFound: number;
  events: ScrapedEvent[];
  rawHtmlLength?: number;
  selectorUsed?: string;
  scraperEngine?: string;
  error?: string;
  notes?: string;
  latencyMs?: number;
  cached?: boolean;
}

interface ApiMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
  cachedDatesCount: number;
  uptimeSeconds: number;
}

const app = express();
const PORT = 3000;
const serverStartTime = Date.now();

app.use(express.json());

// Global CORS & caching headers for REST API consumers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Telemetry & metrics
let totalApiRequests = 0;
let totalCacheHits = 0;
let totalCacheMisses = 0;

// In-memory cache with TTL
interface CacheEntry {
  data: ScrapeResult;
  expiresAt: number;
}
const scrapeCache = new Map<string, CacheEntry>();

// Cache sweeper (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of scrapeCache.entries()) {
    if (entry.expiresAt < now) {
      scrapeCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Normalizes input date strings into ForexFactory query parameter format (e.g., "may15.2024")
 * and ISO date format ("2024-05-15").
 */
function normalizeDateParam(dateStr?: string): { dayParam: string; formattedDate: string } {
  let dateObj = new Date();
  const lower = (dateStr || "").trim().toLowerCase();

  if (!lower || lower === "today") {
    dateObj = new Date();
  } else if (lower === "yesterday") {
    dateObj = new Date(Date.now() - 86400000);
  } else if (lower === "tomorrow") {
    dateObj = new Date(Date.now() + 86400000);
  } else {
    const parts = lower.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        dateObj = new Date(Date.UTC(y, m, d));
      }
    } else {
      const parsed = new Date(dateStr!);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
  }

  const monthStr = MONTH_NAMES[dateObj.getUTCMonth()];
  const dayNum = dateObj.getUTCDate();
  const yearNum = dateObj.getUTCFullYear();

  return {
    dayParam: `${monthStr}${dayNum}.${yearNum}`,
    formattedDate: `${yearNum}-${String(dateObj.getUTCMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`,
  };
}

/**
 * Standardizes ForexFactory impact classifications into structured levels, scores, and labels.
 */
function parseImpact(title: string, className: string): { level: ImpactLevel; score: number; cleanTitle: string } {
  const t = (title || "").toLowerCase();
  const c = (className || "").toLowerCase();

  if (t.includes("high") || c.includes("red") || c.includes("impact-red")) {
    return { level: "High", score: 3, cleanTitle: title.trim() || "High Impact Expected" };
  }
  if (t.includes("medium") || c.includes("ora") || c.includes("impact-ora")) {
    return { level: "Medium", score: 2, cleanTitle: title.trim() || "Medium Impact Expected" };
  }
  if (t.includes("low") || c.includes("yel") || c.includes("impact-yel")) {
    return { level: "Low", score: 1, cleanTitle: title.trim() || "Low Impact Expected" };
  }
  if (t.includes("non") || t.includes("holiday") || c.includes("gra") || c.includes("impact-gra")) {
    return { level: "Non-Economic", score: 0, cleanTitle: title.trim() || "Non-Economic / Holiday" };
  }

  return { level: "Low", score: 1, cleanTitle: title.trim() || "Low Impact Expected" };
}

/**
 * Parses Markdown tables returned by Jina Reader fallback.
 */
function parseMarkdownTable(md: string, targetDate: string): ScrapedEvent[] {
  const lines = md.split("\n");
  const events: ScrapedEvent[] = [];
  let currentDate = targetDate;
  let currentTime = "All Day";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed.includes("---") || trimmed.includes("Date |") || trimmed.includes("Time Options")) {
      continue;
    }

    const cols = trimmed.split("|").map((c) => c.trim()).slice(1, -1);
    if (cols.length < 3) continue;

    if (cols.length <= 2 && cols[0].match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+[A-Z][a-z]{2}\s+\d+/i)) {
      currentDate = cols[0];
      continue;
    }

    const currIdx = cols.findIndex((c) => ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"].includes(c.toUpperCase()));
    if (currIdx === -1) continue;

    const currency = cols[currIdx].toUpperCase();

    if (currIdx > 0 && cols[currIdx - 1]) {
      const timeCandidate = cols[currIdx - 1];
      if (timeCandidate.match(/\d{1,2}:\d{2}(am|pm)/i) || timeCandidate.toLowerCase().includes("all day") || timeCandidate.toLowerCase().includes("tentative")) {
        currentTime = timeCandidate;
      }
    }

    let title = "";
    for (let i = currIdx + 1; i < cols.length; i++) {
      const colText = cols[i];
      if (colText && !colText.startsWith("[!") && !colText.startsWith("[") && colText.length > 2 && !colText.match(/^[-+]?\d+(\.\d+)?%?$/)) {
        title = colText;
        break;
      }
    }

    if (!title) continue;

    let impact: ImpactLevel = "Low";
    const lineLower = line.toLowerCase();
    if (lineLower.includes("high") || lineLower.includes("red") || lineLower.includes("detail-level-3")) impact = "High";
    else if (lineLower.includes("medium") || lineLower.includes("orange") || lineLower.includes("detail-level-2")) impact = "Medium";
    else if (lineLower.includes("holiday") || lineLower.includes("non-economic") || lineLower.includes("detail-level-0")) impact = "Non-Economic";

    const numbers = cols.filter((c) => c.match(/^[-+]?\d+(\.\d+)?%?[kmbKMB]?$/) || c.match(/^<|>|~/));
    const actual = numbers[0] || "";
    const forecast = numbers[1] || "";
    const previous = numbers[2] || "";

    events.push({
      id: `evt_md_${events.length + 1}`,
      date: currentDate,
      time: currentTime,
      currency,
      impact,
      impactTitle: `${impact} Impact Expected`,
      impactClass: `impact-${impact.toLowerCase().substring(0, 3)}`,
      impactScore: impact === "High" ? 3 : impact === "Medium" ? 2 : impact === "Low" ? 1 : 0,
      title,
      actual,
      forecast,
      previous,
      actualStatus: "neutral",
      rawRowData: [currentDate, currentTime, currency, impact, title, actual, forecast, previous],
    });
  }
  return events;
}

/**
 * Scrapes one day, trying a few sources in order and keeping the first usable response.
 */
async function scrapeForexFactory(dateStr: string): Promise<ScrapeResult> {
  const startTime = Date.now();
  const { dayParam, formattedDate } = normalizeDateParam(dateStr);
  const targetUrl = `https://www.forexfactory.com/calendar?day=${dayParam}`;
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;

  // 1. Cache check
  const cachedEntry = scrapeCache.get(formattedDate);
  if (cachedEntry && cachedEntry.data.totalEventsFound > 0 && Date.now() < cachedEntry.expiresAt) {
    totalCacheHits++;
    return {
      ...cachedEntry.data,
      latencyMs: Date.now() - startTime,
      cached: true,
    };
  }

  totalCacheMisses++;
  let html = "";
  let markdown = "";
  let scraperEngine = "";

  const fetchWithTimeout = async (url: string, opts: RequestInit = {}, timeoutMs = 7000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  // Strategy 1: Jina HTML reader
  try {
    const res = await fetchWithTimeout(jinaUrl, {
      headers: { "X-Return-Format": "html" },
    }, 6000);

    if (res.ok) {
      const text = await res.text();
      if (text.includes("calendar__row") || text.includes("calendar__table") || text.includes("calendar__event")) {
        html = text;
        scraperEngine = "Jina HTML Reader";
      } else if (text.includes("| Date |") || text.includes("| Time |")) {
        markdown = text;
        scraperEngine = "Jina Markdown Reader";
      }
    }
  } catch (err: any) {
    // Continue to next strategy
  }

  // Strategy 2: Jina Markdown Reader Fallback
  if (!html && !markdown) {
    try {
      const res = await fetchWithTimeout(jinaUrl, {}, 6000);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("|") && (text.includes("EUR") || text.includes("USD") || text.includes("GBP"))) {
          markdown = text;
          scraperEngine = "Jina Markdown Engine";
        }
      }
    } catch (err: any) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Direct ForexFactory Fetch Fallback
  if (!html && !markdown) {
    try {
      const directRes = await fetchWithTimeout(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }, 5000);
      if (directRes.ok) {
        const text = await directRes.text();
        if (text.includes("calendar__row") || text.includes("calendar__table")) {
          html = text;
          scraperEngine = "Direct DOM Engine";
        }
      }
    } catch (err: any) {
      // Continue to next strategy
    }
  }

  // Strategy 4: FairEconomy CDN Stream Fallback
  if (!html && !markdown) {
    try {
      const feRes = await fetchWithTimeout("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
        headers: { "Accept": "application/json" },
      }, 4000);
      if (feRes.ok) {
        const feData = await feRes.json();
        if (Array.isArray(feData) && feData.length > 0) {
          const matchingEvents = feData.filter((item: any) => item.date && item.date.startsWith(formattedDate));
          if (matchingEvents.length > 0) {
            const events: ScrapedEvent[] = matchingEvents.map((item: any, idx: number) => {
              const impactParsed = parseImpact(item.impact || "", "");
              let actStatus: "better" | "worse" | "neutral" = "neutral";
              const actNum = parseFloat(item.actual);
              const fcNum = parseFloat(item.forecast);
              if (!isNaN(actNum) && !isNaN(fcNum)) {
                if (actNum > fcNum) actStatus = "better";
                else if (actNum < fcNum) actStatus = "worse";
              }

              const timeStr = item.date ? item.date.split("T")[1]?.substring(0, 5) || "All Day" : "All Day";

              return {
                id: `fe_${idx + 1}`,
                date: formattedDate,
                time: timeStr,
                currency: item.country || item.currency || "USD",
                impact: impactParsed.level,
                impactTitle: impactParsed.cleanTitle,
                impactClass: `impact-${impactParsed.level.toLowerCase().substring(0, 3)}`,
                impactScore: impactParsed.score,
                title: item.title || "Economic Release",
                actual: item.actual || "",
                forecast: item.forecast || "",
                previous: item.previous || "",
                actualStatus: actStatus,
                rawRowData: [formattedDate, timeStr, item.country, item.impact, item.title, item.actual, item.forecast, item.previous],
              };
            });

            const elapsed = Date.now() - startTime;
            const result: ScrapeResult = {
              url: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
              dateQueried: formattedDate,
              timestamp: new Date().toISOString(),
              totalEventsFound: events.length,
              events,
              rawHtmlLength: JSON.stringify(feData).length,
              selectorUsed: "JSON Feed",
              scraperEngine: "FairEconomy CDN Data Stream",
              notes: "Retrieved from the FairEconomy weekly JSON feed.",
              latencyMs: elapsed,
              cached: false,
            };

            scrapeCache.set(formattedDate, {
              data: result,
              expiresAt: Date.now() + 3 * 60 * 1000,
            });

            return result;
          }
        }
      }
    } catch (err: any) {
      // Continue
    }
  }

  // Parse Markdown if obtained
  if (!html && markdown) {
    const mdEvents = parseMarkdownTable(markdown, formattedDate);
    const elapsed = Date.now() - startTime;
    const result: ScrapeResult = {
      url: targetUrl,
      dateQueried: formattedDate,
      timestamp: new Date().toISOString(),
      totalEventsFound: mdEvents.length,
      events: mdEvents,
      rawHtmlLength: markdown.length,
      selectorUsed: "markdown-table",
      scraperEngine: scraperEngine || "Jina Markdown Engine",
      notes: "Scraped via ForexFactory Markdown Reader.",
      latencyMs: elapsed,
      cached: false,
    };

    if (mdEvents.length > 0) {
      scrapeCache.set(formattedDate, {
        data: result,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }
    return result;
  }

  const elapsed = Date.now() - startTime;

  if (!html) {
    return {
      url: targetUrl,
      dateQueried: formattedDate,
      timestamp: new Date().toISOString(),
      totalEventsFound: 0,
      events: [],
      notes: "No economic events scheduled for this date.",
      latencyMs: elapsed,
      cached: false,
    };
  }

  // Parse HTML with Cheerio
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];
  let currentDate = formattedDate;
  let currentTime = "All Day";

  const rows = $("tr.calendar__row");

  rows.each((index, el) => {
    const $row = $(el);
    if ($row.hasClass("calendar__row--header") || $row.find("th").length > 0) {
      return;
    }

    const eventId = $row.attr("data-event-id") || $row.attr("data-eventid") || `evt_${index + 1}`;

    const dateText = $row.find(".calendar__date").text().trim();
    if (dateText) currentDate = dateText;

    const timeText = $row.find(".calendar__time").text().trim();
    if (timeText) currentTime = timeText;

    const currency = $row.find(".calendar__currency").text().trim().toUpperCase();

    // Impact extraction
    const $impactCell = $row.find(".calendar__impact");
    let impactTitle = "";
    let impactClass = "";

    const impactElements = $impactCell.add($impactCell.find("*"));
    impactElements.each((_, elem) => {
      const $elem = $(elem);
      const titleAttr = $elem.attr("title");
      const classAttr = $elem.attr("class");
      if (titleAttr && !impactTitle) impactTitle = titleAttr.trim();
      if (classAttr) impactClass += ` ${classAttr}`;
    });

    impactClass = impactClass.trim();
    const impactInfo = parseImpact(impactTitle, impactClass);

    const title = $row.find(".calendar__event-title").text().trim() || $row.find(".calendar__event").text().trim();
    if (!currency && !title) return;

    const detailId = $row.find(".calendar__detail-link").attr("data-event-id") || undefined;
    const $actualCell = $row.find(".calendar__actual");
    const actual = $actualCell.text().trim();
    const forecast = $row.find(".calendar__forecast").text().trim();
    const $previousCell = $row.find(".calendar__previous");
    const previous = $previousCell.text().trim();
    const previousRevised = $previousCell.find(".calendar__prev-revised, .revised, [title*='Revised']").length > 0;

    let actualStatus: "better" | "worse" | "neutral" = "neutral";
    const actualCellClass = $actualCell.attr("class") || "";
    if (actualCellClass.includes("better") || $actualCell.find(".better").length > 0) {
      actualStatus = "better";
    } else if (actualCellClass.includes("worse") || $actualCell.find(".worse").length > 0) {
      actualStatus = "worse";
    }

    const rawRowData: string[] = [];
    $row.find("td").each((_, td) => {
      rawRowData.push($(td).text().trim());
    });

    events.push({
      id: eventId,
      date: currentDate || formattedDate,
      time: currentTime || "All Day",
      currency,
      impact: impactInfo.level,
      impactTitle: impactInfo.cleanTitle,
      impactClass,
      impactScore: impactInfo.score,
      title,
      detailId,
      actual,
      forecast,
      previous,
      previousRevised,
      actualStatus,
      rawRowData,
    });
  });

  const finalLatency = Date.now() - startTime;
  const result: ScrapeResult = {
    url: targetUrl,
    dateQueried: formattedDate,
    timestamp: new Date().toISOString(),
    totalEventsFound: events.length,
    events,
    rawHtmlLength: html.length,
    selectorUsed: "tr.calendar__row",
    scraperEngine: scraperEngine || "DOM Parser Engine",
    notes: `Scraped via ${scraperEngine || "Engine"}.`,
    latencyMs: finalLatency,
    cached: false,
  };

  // Cache valid scraped datasets (24h for historical, 3min for current/future)
  if (events.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];
    const isHistorical = formattedDate < todayStr;
    const ttlMs = isHistorical ? 24 * 60 * 60 * 1000 : 3 * 60 * 1000;

    scrapeCache.set(formattedDate, {
      data: result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  return result;
}

// REST CALENDAR HANDLER (JSON & CSV)
async function handleCalendarRequest(req: Request, res: Response) {
  totalApiRequests++;
  try {
    let dateQuery = (req.params.date as string) || (req.query.date as string) || (req.query.day as string) || "today";
    let formatQuery = ((req.query.format as string) || "json").toLowerCase();

    // Allow path extension e.g., /api/v1/calendar/2024-05-15.csv
    if (dateQuery.toLowerCase().endsWith(".csv")) {
      dateQuery = dateQuery.substring(0, dateQuery.length - 4);
      formatQuery = "csv";
    }

    const currencyQuery = (req.query.currency as string) || (req.query.currencies as string) || "";
    const impactQuery = (req.query.impact as string) || (req.query.impacts as string) || "";
    const searchQuery = ((req.query.search as string) || (req.query.q as string) || "").trim().toLowerCase();
    const hasActualQuery = req.query.hasActual === "true";
    const sortQuery = (req.query.sort as string) || "time";
    const orderQuery = (req.query.order as string) || "asc";
    const limitQuery = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offsetQuery = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await scrapeForexFactory(dateQuery);

    // Cache-Control headers
    const todayStr = new Date().toISOString().split("T")[0];
    if (result.dateQueried < todayStr) {
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    } else {
      res.setHeader("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
    }

    let filteredEvents = [...result.events];

    // Filter by currency
    if (currencyQuery.trim()) {
      const allowedCurrencies = currencyQuery.toUpperCase().split(",").map((c) => c.trim()).filter(Boolean);
      if (allowedCurrencies.length > 0) {
        filteredEvents = filteredEvents.filter((e) => allowedCurrencies.includes(e.currency.toUpperCase()));
      }
    }

    // Filter by impact
    if (impactQuery.trim()) {
      const allowedImpacts = impactQuery.toLowerCase().split(",").map((i) => i.trim()).filter(Boolean);
      filteredEvents = filteredEvents.filter((e) => {
        const impLower = e.impact.toLowerCase();
        return allowedImpacts.some((target) => {
          if (target === "red" && impLower === "high") return true;
          if ((target === "orange" || target === "ora") && impLower === "medium") return true;
          if ((target === "yellow" || target === "yel") && impLower === "low") return true;
          if ((target === "gray" || target === "gra" || target === "holiday") && impLower === "non-economic") return true;
          return impLower.includes(target) || target.includes(impLower);
        });
      });
    }

    // Filter by search keyword
    if (searchQuery) {
      filteredEvents = filteredEvents.filter((e) => {
        return (
          e.title.toLowerCase().includes(searchQuery) ||
          e.currency.toLowerCase().includes(searchQuery) ||
          e.impact.toLowerCase().includes(searchQuery)
        );
      });
    }

    // Filter by released actual status
    if (hasActualQuery) {
      filteredEvents = filteredEvents.filter((e) => e.actual && e.actual.trim() !== "" && e.actual.trim() !== "—");
    }

    // Sort events
    filteredEvents.sort((a, b) => {
      let comp = 0;
      if (sortQuery === "currency") {
        comp = a.currency.localeCompare(b.currency);
      } else if (sortQuery === "impact") {
        comp = (a.impactScore || 0) - (b.impactScore || 0);
      } else if (sortQuery === "actual") {
        comp = a.actual.localeCompare(b.actual);
      } else {
        comp = a.time.localeCompare(b.time);
      }
      return orderQuery === "desc" ? -comp : comp;
    });

    // Pagination
    const totalMatching = filteredEvents.length;
    if (limitQuery && limitQuery > 0) {
      filteredEvents = filteredEvents.slice(offsetQuery, offsetQuery + limitQuery);
    }

    // CSV format output
    if (formatQuery === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="forexfactory_${result.dateQueried}.csv"`);

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

      const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      return res.type("text/csv").send(csvString);
    }

    res.json({
      ...result,
      totalEventsFound: totalMatching,
      returnedEventsCount: filteredEvents.length,
      events: filteredEvents,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch calendar data" });
  }
}

// REST ENDPOINTS

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    service: "Unofficial ForexFactory REST API",
  });
});

// Telemetry & Cache Metrics
app.get("/api/v1/metrics", (_req: Request, res: Response) => {
  const total = totalCacheHits + totalCacheMisses;
  const hitRatio = total > 0 ? +(totalCacheHits / total).toFixed(4) : 0;

  const metrics: ApiMetrics = {
    totalRequests: totalApiRequests,
    cacheHits: totalCacheHits,
    cacheMisses: totalCacheMisses,
    hitRatio,
    cachedDatesCount: scrapeCache.size,
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
  };

  res.json(metrics);
});

// Currencies directory
app.get("/api/v1/currencies", async (_req: Request, res: Response) => {
  try {
    const todayResult = await scrapeForexFactory("today");
    const currencies = Array.from(new Set(todayResult.events.map((e) => e.currency).filter(Boolean)));
    res.json({
      currencies: currencies.length > 0 ? currencies : ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"],
      count: currencies.length > 0 ? currencies.length : 9,
      majors: ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// OpenAPI 3.0 Specification
app.get("/api/v1/spec", (_req: Request, res: Response) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "Unofficial ForexFactory Calendar API",
      version: "1.2.0",
      description: "Unofficial JSON and CSV API for ForexFactory economic calendar data.",
    },
    servers: [{ url: "/api/v1", description: "API Version 1" }],
    paths: {
      "/calendar": {
        get: {
          summary: "Get Economic Calendar Events",
          description: "Scrapes and filters real-time or historical economic calendar events.",
          parameters: [
            { name: "date", in: "query", schema: { type: "string" }, description: "Date in YYYY-MM-DD format, or 'today', 'yesterday', 'tomorrow'" },
            { name: "currency", in: "query", schema: { type: "string" }, description: "Comma-separated currencies e.g. USD,EUR,GBP" },
            { name: "impact", in: "query", schema: { type: "string" }, description: "Comma-separated impact levels: High, Medium, Low, Non-Economic" },
            { name: "search", in: "query", schema: { type: "string" }, description: "Search keyword matching event title or currency" },
            { name: "hasActual", in: "query", schema: { type: "boolean" }, description: "Filter only released events with actual numbers" },
            { name: "sort", in: "query", schema: { type: "string", enum: ["time", "impact", "currency", "actual"] }, description: "Field to sort by" },
            { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] }, description: "Sort direction" },
            { name: "limit", in: "query", schema: { type: "integer" }, description: "Limit number of events returned" },
            { name: "format", in: "query", schema: { type: "string", enum: ["json", "csv"] }, description: "Response payload format" },
          ],
          responses: { "200": { description: "Successful response with events array or CSV document" } },
        },
      },
      "/today": { get: { summary: "Get Today's Calendar" } },
      "/high-impact": { get: { summary: "Get High-Impact (Red Folder) Events" } },
      "/metrics": { get: { summary: "API Performance & Cache Metrics" } },
    },
  });
});

// Primary Calendar Routes
app.get("/api/v1/calendar", handleCalendarRequest);
app.get("/api/v1/calendar/:date", handleCalendarRequest);
app.get("/api/v1/events", handleCalendarRequest);
app.get("/api/calendar", handleCalendarRequest);
app.get("/api/calendar/:date", handleCalendarRequest);
app.get("/api/scrape", handleCalendarRequest);

// Shortcut Endpoints
app.get("/api/v1/today", (req: Request, res: Response) => {
  req.query.date = "today";
  return handleCalendarRequest(req, res);
});
app.get("/api/today", (req: Request, res: Response) => {
  req.query.date = "today";
  return handleCalendarRequest(req, res);
});

app.get("/api/v1/yesterday", (req: Request, res: Response) => {
  req.query.date = "yesterday";
  return handleCalendarRequest(req, res);
});
app.get("/api/yesterday", (req: Request, res: Response) => {
  req.query.date = "yesterday";
  return handleCalendarRequest(req, res);
});

app.get("/api/v1/tomorrow", (req: Request, res: Response) => {
  req.query.date = "tomorrow";
  return handleCalendarRequest(req, res);
});
app.get("/api/tomorrow", (req: Request, res: Response) => {
  req.query.date = "tomorrow";
  return handleCalendarRequest(req, res);
});

app.get("/api/v1/high-impact", (req: Request, res: Response) => {
  req.query.impact = "High";
  return handleCalendarRequest(req, res);
});
app.get("/api/high-impact", (req: Request, res: Response) => {
  req.query.impact = "High";
  return handleCalendarRequest(req, res);
});

// Static front end: one hand-written HTML page, no build step.
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));

// Unknown API paths should answer as an API, not with the HTML page.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] ForexFactory API server running at http://0.0.0.0:${PORT}`);
});
