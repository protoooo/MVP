"""
Base scraper class with shared scraping logic for all county scrapers.
Handles HTTP requests, pagination, and data extraction using CSS selectors.
"""

import time
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from utils.logger import setup_logger
from utils.data_cleaning import DataCleaner
from utils.pdf_handler import PDFHandler


class BaseScraper:
    """
    Base class for scraping inspection reports from county websites.
    
    Attributes:
        county_name (str): Name of the county being scraped
        config (dict): Configuration dictionary containing URL, selectors, and fields
        delay (int): Delay in seconds between requests (default: 3)
        logger: Logger instance for tracking scraping progress
    """
    
    def __init__(self, county_name: str, config: dict, delay: int = 3):
        """
        Initialize the base scraper with county configuration.
        
        Args:
            county_name: Name of the county
            config: Configuration dictionary with URL, selectors, and field mappings
            delay: Seconds to wait between requests to respect rate limiting
        """
        self.county_name = county_name
        self.config = config
        self.delay = delay
        self.logger = setup_logger()
        self.data_cleaner = DataCleaner()
        self.pdf_handler = PDFHandler()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """
        Fetch a web page and return parsed BeautifulSoup object.
        
        Args:
            url: URL to fetch
            
        Returns:
            BeautifulSoup object if successful, None otherwise
        """
        try:
            self.logger.info(f"Fetching: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except requests.RequestException as e:
            self.logger.error(f"Error fetching {url}: {str(e)}")
            return None
    
    def extract_field(self, row, selector: str) -> str:
        """
        Extract text from a row using a CSS selector.
        
        Args:
            row: BeautifulSoup element representing a table row
            selector: CSS selector string
            
        Returns:
            Extracted and cleaned text, or empty string if not found
        """
        try:
            element = row.select_one(selector)
            if element:
                return element.get_text(strip=True)
            return ""
        except Exception as e:
            self.logger.warning(f"Error extracting field with selector {selector}: {str(e)}")
            return ""
    
    def extract_link(self, row, selector: str) -> str:
        """
        Extract href attribute from a link element.
        
        Args:
            row: BeautifulSoup element representing a table row
            selector: CSS selector string
            
        Returns:
            URL string, or empty string if not found
        """
        try:
            element = row.select_one(selector)
            if element and element.has_attr('href'):
                return element['href']
            return ""
        except Exception as e:
            self.logger.warning(f"Error extracting link with selector {selector}: {str(e)}")
            return ""
    
    def parse_inspection_row(self, row) -> Dict[str, str]:
        """
        Parse a single inspection row and extract all fields.
        
        Args:
            row: BeautifulSoup element representing an inspection row
            
        Returns:
            Dictionary containing extracted inspection data
        """
        fields = self.config.get('fields', {})
        
        data = {
            'county': self.county_name,
            'business_name': self.extract_field(row, fields.get('business_name', '')),
            'address': self.extract_field(row, fields.get('address', '')),
            'inspection_date': self.extract_field(row, fields.get('inspection_date', '')),
            'violations': self.extract_field(row, fields.get('violations', '')),
            'severity': self.extract_field(row, fields.get('severity', '')),
            'report_link': self.extract_link(row, fields.get('report_link', ''))
        }
        
        # Normalize the data
        data['business_name'] = self.data_cleaner.normalize_business_name(data['business_name'])
        data['address'] = self.data_cleaner.normalize_address(data['address'])
        data['inspection_date'] = self.data_cleaner.normalize_date(data['inspection_date'])
        
        return data
    
    def get_next_page_url(self, soup: BeautifulSoup, current_url: str) -> Optional[str]:
        """
        Find the URL for the next page of results.
        
        Args:
            soup: BeautifulSoup object of current page
            current_url: Current page URL for resolving relative URLs
            
        Returns:
            Next page URL if found, None otherwise
        """
        pagination_selector = self.config.get('pagination_selector', '')
        if not pagination_selector:
            return None
        
        try:
            next_link = soup.select_one(pagination_selector)
            if next_link and next_link.has_attr('href'):
                next_url = next_link['href']
                # Handle relative URLs
                if not next_url.startswith('http'):
                    from urllib.parse import urljoin
                    next_url = urljoin(current_url, next_url)
                return next_url
            return None
        except Exception as e:
            self.logger.warning(f"Error finding next page: {str(e)}")
            return None
    
    def scrape_page(self, url: str) -> List[Dict[str, str]]:
        """
        Scrape a single page and extract all inspection records.
        
        Args:
            url: URL of the page to scrape
            
        Returns:
            List of dictionaries containing inspection data
        """
        soup = self.fetch_page(url)
        if not soup:
            return []
        
        records = []
        row_selector = self.config.get('row_selector', '')
        
        if not row_selector:
            self.logger.error(f"No row selector configured for {self.county_name}")
            return []
        
        rows = soup.select(row_selector)
        self.logger.info(f"Found {len(rows)} inspection rows on page")
        
        for row in rows:
            try:
                record = self.parse_inspection_row(row)
                if record.get('business_name'):  # Only add if we have at least a business name
                    records.append(record)
            except Exception as e:
                self.logger.error(f"Error parsing row: {str(e)}")
                continue
        
        return records
    
    def scrape(self, download_pdfs: bool = False) -> List[Dict[str, str]]:
        """
        Scrape all pages of inspection reports for this county.
        
        Args:
            download_pdfs: Whether to download PDF reports (default: False)
            
        Returns:
            List of all inspection records found
        """
        all_records = []
        url = self.config.get('url', '')
        
        if not url:
            self.logger.error(f"No URL configured for {self.county_name}")
            return []
        
        self.logger.info(f"Starting scrape for {self.county_name}")
        page_count = 0
        
        while url and page_count < 100:  # Safety limit of 100 pages
            page_count += 1
            self.logger.info(f"Scraping page {page_count}: {url}")
            
            # Scrape current page
            records = self.scrape_page(url)
            all_records.extend(records)
            
            # Download PDFs if requested
            if download_pdfs:
                for record in records:
                    if record.get('report_link'):
                        self.pdf_handler.download_pdf(
                            record['report_link'],
                            self.county_name,
                            record.get('business_name', 'unknown'),
                            record.get('inspection_date', 'unknown')
                        )
            
            # Get next page URL
            soup = self.fetch_page(url)
            if soup:
                next_url = self.get_next_page_url(soup, url)
                if next_url and next_url != url:
                    url = next_url
                    time.sleep(self.delay)  # Rate limiting
                else:
                    break
            else:
                break
        
        self.logger.info(f"Completed scrape for {self.county_name}. Found {len(all_records)} records across {page_count} pages")
        return all_records
