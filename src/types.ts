export type ImpactLevel = 'High' | 'Medium' | 'Low' | 'Non-Economic' | 'Unknown';

export interface ScrapedEvent {
  id: string;
  date: string; // e.g. "2024-05-15" or "Wed May 15"
  time: string; // e.g. "8:30am", "All Day", "Tentative"
  currency: string; // e.g. "USD", "EUR"
  impact: ImpactLevel;
  impactTitle: string; // Raw title attribute scraped e.g. "High Impact Expected"
  impactClass: string;
  title: string;
  detailId?: string;
  actual: string;
  forecast: string;
  previous: string;
  previousRevised?: boolean; // Whether the previous figure was revised
  actualStatus?: 'better' | 'worse' | 'neutral';
  rawRowData?: string[];
  impactScore?: number; // 3 for High, 2 for Medium, 1 for Low, 0 for Non-Economic
}

export interface ScrapeRequest {
  date?: string;
  currencies?: string[];
  impacts?: ImpactLevel[];
  search?: string;
  hasActual?: boolean;
  format?: 'json' | 'csv';
}

export interface ScrapeResult {
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

export interface ApiMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
  cachedDatesCount: number;
  uptimeSeconds: number;
}


