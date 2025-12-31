# Multi-County Inspection Scraper

A comprehensive Python project for scraping inspection reports from Washtenaw County, Wayne County, and Oakland County. The scraper handles pagination, extracts structured inspection data, optionally downloads PDFs, normalizes the data, and outputs to JSON/CSV formats.

## Features

- **Multi-County Support**: Scrapes from Washtenaw, Wayne, and Oakland counties
- **Configurable**: JSON-based configuration for easy addition of new counties
- **Pagination Handling**: Automatically follows pagination links
- **Data Normalization**: Standardizes business names, addresses, and dates
- **PDF Download**: Optional downloading of inspection report PDFs
- **Multiple Output Formats**: JSON and CSV export
- **Rate Limiting**: Configurable delays between requests (default: 3 seconds)
- **Error Handling**: Robust error handling with retry logic
- **Logging**: Comprehensive logging of scraping progress
- **Database Ready**: Includes SQL schema for PostgreSQL/Supabase

## Project Structure

```
inspection_scraper/
│
├── config/
│   └── counties.json          # JSON config for each county
│
├── scrapers/
│   ├── __init__.py
│   ├── base_scraper.py        # Base class with shared scraping logic
│   ├── washtenaw.py           # Washtenaw County scraper
│   ├── wayne.py               # Wayne County scraper
│   └── oakland.py             # Oakland County scraper
│
├── utils/
│   ├── __init__.py
│   ├── pdf_handler.py         # PDF download functionality
│   ├── data_cleaning.py       # Data normalization utilities
│   └── logger.py              # Logging configuration
│
├── outputs/
│   ├── inspections.json       # JSON output (generated)
│   └── inspections.csv        # CSV output (generated)
│
├── main.py                    # Main script to run all scrapers
└── README.md                  # This file
```

## Installation

### Prerequisites

- Python 3.7 or higher
- pip package manager

### Install Dependencies

```bash
cd inspection_scraper
pip install -r requirements.txt
```

Required packages:
- requests
- beautifulsoup4
- pandas

## Usage

### Basic Usage

Run the scraper for all counties:

```bash
cd inspection_scraper
python main.py
```

This will:
1. Scrape inspection data from all three counties
2. Normalize the data
3. Save results to `outputs/inspections.json` and `outputs/inspections.csv`
4. Print SQL schema for database setup

### Enable PDF Downloads

To download PDF reports, edit `main.py` and set:

```python
DOWNLOAD_PDFS = True
```

PDFs will be saved to `outputs/pdfs/` with naming pattern: `{county}_{business_name}_{date}.pdf`

### Configuration

County configurations are stored in `config/counties.json`. Each county has:

- **url**: Main URL for inspection listings
- **pagination_selector**: CSS selector for "next page" link
- **row_selector**: CSS selector for inspection rows
- **fields**: CSS selectors for each data field

### Adding a New County

1. Add county configuration to `config/counties.json`:

```json
{
  "new_county": {
    "url": "https://www.newcounty.gov/inspections",
    "pagination_selector": "a.next-page",
    "row_selector": ".inspection-item",
    "fields": {
      "business_name": ".name",
      "address": ".addr",
      "inspection_date": ".date",
      "violations": ".violations",
      "severity": ".level",
      "report_link": "a.pdf"
    }
  }
}
```

2. Create scraper class in `scrapers/new_county.py`:

```python
from .base_scraper import BaseScraper
import json
import os

class NewCountyScraper(BaseScraper):
    def __init__(self, delay: int = 3):
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'config',
            'counties.json'
        )
        with open(config_path, 'r') as f:
            configs = json.load(f)
        config = configs.get('new_county', {})
        super().__init__('new_county', config, delay)
```

3. Update `scrapers/__init__.py` to include the new scraper

4. Add to `main.py` scrapers list:

```python
scrapers = [
    ('Washtenaw', WashtenawScraper(delay=3)),
    ('Wayne', WayneScraper(delay=3)),
    ('Oakland', OaklandScraper(delay=3)),
    ('NewCounty', NewCountyScraper(delay=3))
]
```

## Database Schema

The scraper includes a PostgreSQL/Supabase schema for storing inspection data. The schema is printed when running `main.py` and can be used to set up your database:

```sql
CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    county TEXT NOT NULL,
    business_name TEXT NOT NULL,
    address TEXT,
    inspection_date DATE,
    violations TEXT,
    severity TEXT,
    report_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Includes indexes on:
- county
- business_name
- inspection_date
- severity

## Output Formats

### JSON Output

`outputs/inspections.json` contains an array of inspection records:

```json
[
  {
    "county": "washtenaw",
    "business_name": "Example Restaurant",
    "address": "123 Main Street",
    "inspection_date": "2024-01-15",
    "violations": "Temperature control issue",
    "severity": "medium",
    "report_link": "https://example.com/report.pdf"
  }
]
```

### CSV Output

`outputs/inspections.csv` contains the same data in CSV format with headers.

## Data Normalization

The scraper automatically normalizes:

- **Business Names**: Removes extra whitespace, standardizes punctuation
- **Addresses**: Standardizes street abbreviations (St → Street, Ave → Avenue, etc.)
- **Dates**: Converts to ISO format (YYYY-MM-DD)
- **Severity Levels**: Maps to standard values (critical, high, medium, low)

## Rate Limiting

The scraper respects rate limiting with configurable delays:

- Default: 3 seconds between page requests
- Configurable per-county in scraper initialization
- Prevents overloading county servers

## Error Handling

The scraper includes:

- Request timeout handling (30 seconds)
- Retry logic for failed requests
- Graceful error recovery (continues with next county if one fails)
- Comprehensive error logging

## Logging

All scraping activity is logged with:

- Timestamp
- Log level (INFO, WARNING, ERROR)
- Descriptive messages
- Progress tracking

Logs are output to console in real-time.

## Modular Design

The project is designed for easy extension:

- **BaseScraper**: Common scraping logic shared by all counties
- **County-specific scrapers**: Minimal code, just load config
- **Utility modules**: Reusable PDF, cleaning, and logging functions
- **JSON configuration**: No code changes needed for different selectors

## Best Practices

1. **Rate Limiting**: Always use appropriate delays (2-5 seconds)
2. **Error Handling**: Check logs for any scraping errors
3. **Data Validation**: Review output files for data quality
4. **PDF Storage**: Monitor disk space when downloading PDFs
5. **Regular Updates**: Update selectors if county websites change

## Troubleshooting

### No Data Scraped

- Check if county URLs are accessible
- Verify CSS selectors in `config/counties.json` match current website structure
- Review logs for specific error messages

### PDF Download Failures

- Verify PDF URLs are valid
- Check network connectivity
- Ensure `outputs/pdfs/` directory has write permissions

### Import Errors

- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check Python version is 3.7+

## License

This project is for educational and data transparency purposes.

## Notes

- URLs in `config/counties.json` are placeholders and should be updated with actual county inspection report URLs
- CSS selectors should be updated based on actual website structure
- Always review and respect each county's robots.txt and terms of service
- Consider caching to avoid repeated requests for the same data
