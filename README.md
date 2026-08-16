# ForexFactory Calendar REST API

A clean REST API for ForexFactory economic calendar data. Returns real-time and historical news events in **JSON** or **CSV**.

---

## 🚀 Ultra-Simple GET Requests

You can query any date directly in the URL path:

| GET Request | Output Format | Description |
| :--- | :--- | :--- |
| `GET /api/v1/2014-10-14` | JSON | Fetch events for specific date |
| `GET /api/v1/2014-10-14.csv` | CSV | Direct CSV download for specific date |
| `GET /api/v1/today` | JSON | Today's economic calendar events |
| `GET /api/v1/high-impact` | JSON | High-impact market releases |

---

## ⚙️ Advanced Query Parameters

Use `/api/v1/calendar` for filtering and customization:

```http
GET /api/v1/calendar?date=2014-10-14&currency=USD,EUR&impact=High&format=json
```

| Parameter | Type | Default | Description | Examples |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `string` | `today` | Date in `YYYY-MM-DD` or keyword | `2014-10-14`, `today`, `yesterday` |
| `currency` | `string` | All | Comma-separated currencies | `USD`, `EUR,GBP` |
| `impact` | `string` | All | Comma-separated impact levels | `High`, `Medium,High` |
| `format` | `string` | `json` | Output format (`json` or `csv`) | `json`, `csv` |

---

## ⚡ Quick Examples

> Note: Replace `[BASE_URL]` with your app domain (e.g. `http://localhost:3000` locally).

### 1. Direct JSON Query
```bash
curl "[BASE_URL]/api/v1/2014-10-14"
```

### 2. Direct CSV Export
```bash
curl "[BASE_URL]/api/v1/2014-10-14.csv" -o news.csv
```

### 3. Filtered High-Impact USD Releases
```bash
curl "[BASE_URL]/api/v1/calendar?date=2014-10-14&currency=USD&impact=High"
```

### 4. Google Sheets Formula
```excel
=IMPORTDATA("[BASE_URL]/api/v1/2014-10-14.csv")
```

---

## 📋 JSON Response Format

```json
{
  "url": "https://www.forexfactory.com/calendar?day=oct14.2014",
  "dateQueried": "2014-10-14",
  "totalEventsFound": 18,
  "events": [
    {
      "id": "52282",
      "date": "Tue Oct 14",
      "time": "2:45am",
      "currency": "EUR",
      "impact": "Low",
      "impactTitle": "Low Impact Expected",
      "title": "French Final CPI m/m",
      "actual": "-0.4%",
      "forecast": "-0.3%",
      "previous": "0.4%",
      "actualStatus": "worse"
    }
  ],
  "latencyMs": 0,
  "cached": true
}
```

---

## 💻 Code Snippets

### Node.js / JavaScript
```javascript
const res = await fetch("/api/v1/2014-10-14");
const data = await res.json();
console.log(data.events);
```

### Python
```python
import requests

res = requests.get("https://your-domain.com/api/v1/2014-10-14")
print(res.json()["events"])
```

---

## 🛠️ Local Development

```bash
npm install
npm run dev
```
