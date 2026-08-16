# ForexFactory Calendar REST API

A high-performance, developer-friendly REST API for ForexFactory economic calendar data. Returns real-time and historical economic news events in clean **JSON** or **CSV** with in-memory caching and sub-millisecond query responses.

---

## ⚡ Quick Reference

### Direct Endpoints

| Method | Endpoint | Description | Format |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/today` | Today's economic calendar events | JSON |
| `GET` | `/api/v1/tomorrow` | Tomorrow's scheduled releases | JSON |
| `GET` | `/api/v1/yesterday` | Yesterday's historical releases | JSON |
| `GET` | `/api/v1/high-impact` | High-impact (red folder) events for today | JSON |
| `GET` | `/api/v1/calendar/:date` | Events for any specific date (`YYYY-MM-DD`) | JSON |
| `GET` | `/api/v1/calendar/:date.csv` | Direct CSV export for any date | CSV |
| `GET` | `/api/v1/currencies` | List of all monitored currencies & major pairs | JSON |
| `GET` | `/api/v1/metrics` | Cache hit ratio, uptime & server telemetry | JSON |
| `GET` | `/api/v1/spec` | OpenAPI 3.0 specification | JSON |
| `GET` | `/api/health` | Service health status check | JSON |

---

## 📖 API Documentation

### `GET /api/v1/calendar`

The primary flexible endpoint supporting filtering, searching, sorting, pagination, and format selection.

#### Query Parameters

| Parameter | Type | Default | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `string` | `today` | Date in `YYYY-MM-DD` format or keyword (`today`, `yesterday`, `tomorrow`) | `?date=2024-05-15` |
| `currency` | `string` | *all* | Comma-separated currency codes | `?currency=USD,EUR,GBP` |
| `impact` | `string` | *all* | Comma-separated impact levels (`High`, `Medium`, `Low`, `Non-Economic`) | `?impact=High` |
| `search` | `string` | — | Keyword search across event title, currency, or impact | `?search=CPI` |
| `hasActual` | `boolean` | `false` | When `true`, returns only events where actual data has been released | `?hasActual=true` |
| `sort` | `string` | `time` | Field to sort by: `time`, `impact`, `currency`, `actual` | `?sort=impact` |
| `order` | `string` | `asc` | Sort order: `asc` or `desc` | `?order=desc` |
| `limit` | `number` | — | Maximum number of records to return | `?limit=10` |
| `offset` | `number` | `0` | Number of records to skip for pagination | `?offset=20` |
| `format` | `string` | `json` | Response payload format: `json` or `csv` | `?format=csv` |

---

## 📊 Output Formats

### 1. JSON Response

```json
{
  "url": "https://www.forexfactory.com/calendar?day=may15.2024",
  "dateQueried": "2024-05-15",
  "timestamp": "2026-08-16T13:45:00.000Z",
  "totalEventsFound": 29,
  "returnedEventsCount": 1,
  "events": [
    {
      "id": "136928",
      "date": "2024-05-15",
      "time": "8:30am",
      "currency": "USD",
      "impact": "High",
      "impactTitle": "High Impact Expected",
      "impactClass": "impact-red",
      "impactScore": 3,
      "title": "CPI m/m",
      "actual": "0.3%",
      "forecast": "0.4%",
      "previous": "0.4%",
      "previousRevised": false,
      "actualStatus": "better",
      "rawRowData": ["2024-05-15", "8:30am", "USD", "High", "CPI m/m", "0.3%", "0.4%", "0.4%"]
    }
  ],
  "rawHtmlLength": 185830,
  "selectorUsed": "tr.calendar__row",
  "scraperEngine": "Jina HTML Reader",
  "notes": "Scraped via Jina HTML Reader. Attribute extraction active.",
  "latencyMs": 0,
  "cached": true
}
```

### 2. CSV Export

```csv
Date,Time,Currency,Impact,ImpactScore,ImpactTitle,Title,Actual,Forecast,Previous,ActualStatus,Revised
"2024-05-15","8:30am","USD","High","3","High Impact Expected","CPI m/m","0.3%","0.4%","0.4%","better","false"
"2024-05-15","8:30am","USD","High","3","High Impact Expected","Core CPI m/m","0.3%","0.3%","0.4%","neutral","false"
"2024-05-15","8:30am","USD","High","3","High Impact Expected","Retail Sales m/m","0.0%","0.4%","0.7%","worse","false"
```

---

## 📈 Google Sheets & Excel Integration

Import live ForexFactory data directly into spreadsheet models with automatic refreshes:

```excel
=IMPORTDATA("https://your-domain.com/api/v1/calendar/today.csv")
```

For a specific date:
```excel
=IMPORTDATA("https://your-domain.com/api/v1/calendar/2024-05-15.csv")
```

---

## 💻 Code Examples

### cURL
```bash
# Get high-impact USD events in JSON
curl "https://your-domain.com/api/v1/calendar?date=today&currency=USD&impact=High"

# Download CSV file directly
curl "https://your-domain.com/api/v1/calendar/2024-05-15.csv" -o calendar_2024-05-15.csv
```

### JavaScript / TypeScript (Fetch)
```typescript
async function fetchHighImpactEvents(date: string = "today") {
  const response = await fetch(
    `https://your-domain.com/api/v1/calendar?date=${date}&impact=High&currency=USD,EUR,GBP`
  );
  const data = await response.json();
  return data.events;
}
```

### Python (Requests)
```python
import requests

def get_economic_calendar(date="today", currencies="USD,EUR"):
    url = f"https://your-domain.com/api/v1/calendar"
    params = {
        "date": date,
        "currency": currencies,
        "impact": "High"
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()["events"]

events = get_economic_calendar()
for event in events:
    print(f"[{event['time']}] {event['currency']} - {event['title']} (Actual: {event['actual']}, Forecast: {event['forecast']})")
```

---

## ⚙️ Architecture & Performance

- **Multi-Tier Scraper Redundancy**:
  1. **In-Memory TTL Cache**: Sub-millisecond (<1ms) response for repeat queries.
  2. **Jina HTML Engine**: High-speed, rate-limit immune DOM reader.
  3. **Markdown Parser**: Structured Markdown table fallback.
  4. **Direct DOM Parser**: Direct upstream HTML fallback.
  5. **FairEconomy Stream**: Real-time CDN fallback.
- **Cache Policy**: Historical dates (`date < today`) are cached for 24 hours. Live/future dates are cached for 3 minutes.
- **CORS Enabled**: Out-of-the-box support for browser clients and cross-origin fetch requests (`Access-Control-Allow-Origin: *`).

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run production build
npm run build
```
