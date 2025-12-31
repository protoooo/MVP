# Michigan Food Safety Dashboard

A full-stack Python Flask application that scrapes restaurant inspection data from legacy ASP websites and displays it via a modern web dashboard. Designed for deployment on Railway.

## 🎯 Features

- **Web Scraping**: Scrapes restaurant inspection data from Sword Solutions legacy ASP website
- **Data Storage**: Stores scraped data in JSON format
- **REST API**: Provides JSON endpoint for programmatic access
- **Web Dashboard**: Modern, searchable interface built with Bootstrap 5
- **Background Tasks**: Manual scraping trigger without server restart
- **Production Ready**: Configured for Railway deployment with Gunicorn

## 📦 Project Structure

```
.
├── app.py                  # Flask application with routes
├── scraper.py              # Restaurant inspection scraper
├── requirements.txt        # Python dependencies
├── Procfile               # Railway/Heroku deployment config
├── templates/
│   └── index.html         # Dashboard template
└── inspections.json       # Scraped data (gitignored)
```

## 🚀 Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the scraper** (optional - to populate data):
   ```bash
   python scraper.py
   ```

3. **Start the Flask app**:
   ```bash
   python app.py
   ```

4. **Visit the dashboard**:
   - Dashboard: http://localhost:5000
   - API: http://localhost:5000/api/data
   - Trigger scrape: http://localhost:5000/scrape

### Production Deployment (Railway)

1. **Push to Railway**:
   ```bash
   git push
   ```

2. **Railway will automatically**:
   - Install dependencies from `requirements.txt`
   - Start the app using the `Procfile` command
   - Deploy with Gunicorn

## 🗂️ Target Counties

The scraper targets these Southeast Michigan counties:

- **Washtenaw** (ID: 28)
- **Oakland** (ID: 63)
- **Wayne** (ID: 82)
- **Macomb** (ID: 50)

## 📡 API Endpoints

### `GET /`
Displays the web dashboard with searchable restaurant table.

### `GET /api/data`
Returns raw JSON data of all scraped restaurants.

**Response example**:
```json
[
  {
    "name": "Pizza Palace",
    "address": "123 Main St",
    "city": "Ann Arbor",
    "report_url": "http://www.swordsolutions.com/inspections/...",
    "county_id": 28
  }
]
```

### `GET /scrape`
Triggers background scraping task.

**Response**:
```json
{
  "status": "started",
  "message": "Scraping started in background. Check logs for progress."
}
```

## 🛠️ Technologies

- **Backend**: Flask 3.0.0
- **Scraping**: BeautifulSoup4 4.12.2, Requests 2.31.0
- **Frontend**: Bootstrap 5, Vanilla JavaScript
- **Server**: Gunicorn 21.2.0
- **Scheduling**: Schedule 1.2.0 (for future automation)

## 📝 Usage Notes

### Scraper Behavior
- Handles connection errors gracefully
- Sleeps 2 seconds between counties to be polite to the server
- Saves all data to `inspections.json`
- Logs progress to console

### Dashboard Features
- **Live Search**: Filter restaurants by name or city in real-time
- **Responsive Design**: Works on desktop and mobile
- **Direct Links**: Click "View Report" to see full inspection details
- **Summary Card**: Shows total restaurant count

## 🔐 Production Configuration

The `Procfile` uses Gunicorn with the following settings:
```
web: gunicorn app:app
```

For custom Gunicorn settings, modify the `Procfile`:
```
web: gunicorn app:app --workers 4 --timeout 120
```

## 🐛 Troubleshooting

### No data showing?
Run the scraper manually:
```bash
python scraper.py
```

### Scraper connection errors?
The Sword Solutions website may be down or blocking requests. The scraper will log errors but continue processing other counties.

### Port already in use?
Change the port in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=8000)
```

## 📄 License

This project is provided as-is for educational and public health purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Note**: This application scrapes public health inspection data for transparency and public awareness purposes.
