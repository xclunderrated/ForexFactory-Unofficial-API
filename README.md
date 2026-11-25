# ForexFactory calendar

An unofficial reader for the ForexFactory economic calendar. It serves a small web page
and a REST API that returns the day's events as JSON or CSV.

## Run it

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

## Endpoints

| Endpoint | Returns |
| :--- | :--- |
| `GET /api/v1/today` | today's events |
| `GET /api/v1/yesterday` | yesterday's events |
| `GET /api/v1/tomorrow` | tomorrow's events |
| `GET /api/v1/high-impact` | today's high-impact (red folder) events |
| `GET /api/v1/calendar` | any date, with the filters below |
| `GET /api/v1/calendar/2024-05-15` | one date |
| `GET /api/v1/calendar/2024-05-15.csv` | one date as CSV |
| `GET /api/v1/currencies` | currencies seen in today's data |
| `GET /api/v1/metrics` | cache and uptime numbers |
| `GET /api/v1/spec` | a partial OpenAPI description |
| `GET /api/health` | health check |

## Filters

These work on `/api/v1/calendar` and can be combined.

| Parameter | Description | Example |
| :--- | :--- | :--- |
| `date` | `today`, `yesterday`, `tomorrow`, or `YYYY-MM-DD` | `?date=2024-05-15` |
| `currency` | comma-separated currency codes | `?currency=USD,EUR` |
| `impact` | `High`, `Medium`, `Low`, `Non-Economic` | `?impact=High` |
| `search` | word from the event title | `?search=CPI` |
| `hasActual` | `true` returns only events with a released number | `?hasActual=true` |
| `limit` | maximum number of events | `?limit=10` |
| `format` | `json` (default) or `csv` | `?format=csv` |

## Response

```json
{
  "dateQueried": "2024-05-15",
  "totalEventsFound": 9,
  "returnedEventsCount": 1,
  "events": [
    {
      "id": "136928",
      "time": "8:30am",
      "currency": "USD",
      "impact": "High",
      "impactTitle": "High Impact Expected",
      "impactScore": 3,
      "title": "CPI m/m",
      "actual": "0.3%",
      "forecast": "0.4%",
      "previous": "0.4%",
      "actualStatus": "better"
    }
  ],
  "scraperEngine": "Jina HTML Reader",
  "notes": "Scraped via Jina HTML Reader.",
  "latencyMs": 0,
  "cached": true
}
```

`actualStatus` is `better`, `worse`, or `neutral`, based on the cell styling on the source page.
`totalEventsFound` is the number of events after filtering, before `limit` is applied.

## CSV

```csv
Date,Time,Currency,Impact,ImpactScore,ImpactTitle,Title,Actual,Forecast,Previous,ActualStatus,Revised
"Wed May 15","8:30am","USD","High","3","High Impact Expected","CPI m/m","0.3%","0.4%","0.4%","better","false"
```

## Spreadsheets

```excel
=IMPORTDATA("https://your-domain.com/api/v1/calendar/today.csv")
```

For a specific date:

```excel
=IMPORTDATA("https://your-domain.com/api/v1/calendar/2024-05-15.csv")
```

## Examples

```bash
# High-impact USD events today
curl "https://your-domain.com/api/v1/calendar?date=today&currency=USD&impact=High"

# Save one day as CSV
curl "https://your-domain.com/api/v1/calendar/2024-05-15.csv" -o calendar.csv
```

```js
const res = await fetch("https://your-domain.com/api/v1/calendar?date=today&impact=High");
const data = await res.json();

for (const event of data.events) {
  console.log(event.time, event.currency, event.title, event.actual);
}
```

```python
import requests

res = requests.get("https://your-domain.com/api/v1/calendar", params={
    "date": "today",
    "currency": "USD,EUR",
    "impact": "High",
})
res.raise_for_status()

for event in res.json()["events"]:
    print(event["time"], event["currency"], event["title"])
```

## How it works

- Reads the calendar through `r.jina.ai`, then falls back to the page itself and finally
  the FairEconomy weekly JSON feed.
- Keeps successful results in memory: 3 minutes for today and future dates, 24 hours for past dates.
- CORS is open, so browser clients can call the API directly.

Times are exactly as published by ForexFactory; the API does not convert timezones.

## Layout

```
server.ts        scraping, cache, and the API routes
public/          the web page (plain HTML, CSS, and JavaScript)
```

## Notes

Unofficial and unaffiliated with ForexFactory. Scraping their calendar may conflict with
their terms of use, so keep request rates sensible.
