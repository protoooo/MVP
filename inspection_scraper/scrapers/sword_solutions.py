"""
Enhanced Sword Solutions Scraper - iPad Compatible
Handles JavaScript-heavy inspection sites with multiple detection methods
Integrates with your existing inspection_scraper project structure
"""

import json
import os
import re
import time
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

import requests
from bs4 import BeautifulSoup


class SwordSolutionsScraper:
    """
    Advanced scraper for Sword Solutions inspection portal.
    Handles form-based search, AJAX pagination, and JavaScript-rendered content.
    """
    
    def __init__(self, county: str = "washtenaw", delay: int = 3):
        """
        Initialize scraper with county configuration.
        
        Args:
            county: County name (washtenaw, wayne, oakland)
            delay: Seconds to wait between requests (default: 3)
        """
        self.county = county.lower()
        self.delay = delay
        self.base_url = "https://swordsolutions.com/inspections/"
        
        # Initialize session with realistic headers
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # Statistics
        self.stats = {
            'pages_scraped': 0,
            'records_found': 0,
            'errors': 0,
        }
        
    def detect_site_structure(self) -> Dict:
        """
        Analyze the site to detect its structure and API endpoints.
        This runs first to understand how the site works.
        
        Returns:
            Dictionary with site structure info
        """
        print(f"\n🔍 Analyzing site structure...")
        
        try:
            response = self.session.get(self.base_url, timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            structure = {
                'has_ajax': False,
                'ajax_endpoint': None,
                'has_form': False,
                'form_action': None,
                'form_method': 'POST',
                'county_field_name': None,
                'result_selectors': [],
                'pagination_type': None,
            }
            
            # Check for form
            form = soup.find('form')
            if form:
                structure['has_form'] = True
                structure['form_action'] = form.get('action', self.base_url)
                structure['form_method'] = form.get('method', 'POST').upper()
                print(f"   ✓ Found form: {structure['form_method']} {structure['form_action']}")
                
                # Find county/state field
                county_field = (
                    form.find('select', {'name': re.compile(r'county|state', re.I)}) or
                    form.find('input', {'name': re.compile(r'county|state', re.I)})
                )
                if county_field:
                    structure['county_field_name'] = county_field.get('name')
                    print(f"   ✓ County field: {structure['county_field_name']}")
            
            # Check for AJAX indicators
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and any(keyword in script.string for keyword in ['fetch(', 'XMLHttpRequest', '$.ajax', 'axios']):
                    structure['has_ajax'] = True
                    print(f"   ✓ Detected AJAX/JavaScript data loading")
                    
                    # Try to extract API endpoint from script
                    matches = re.findall(r'["\']([/\w-]+/api/[^"\']+)["\']', script.string or '')
                    if matches:
                        structure['ajax_endpoint'] = matches[0]
                        print(f"   ✓ Possible API endpoint: {structure['ajax_endpoint']}")
            
            # Identify result containers
            possible_selectors = [
                'table.inspection-results tbody tr',
                'div.inspection-row',
                'div.result-item',
                'div[class*="inspection"]',
                'table tbody tr',
                'div.card',
            ]
            
            for selector in possible_selectors:
                elements = soup.select(selector)
                if elements and len(elements) > 3:  # Likely results
                    structure['result_selectors'].append(selector)
                    print(f"   ✓ Possible results selector: {selector} ({len(elements)} items)")
            
            # Identify pagination type
            if soup.select('a.next, a[rel="next"]'):
                structure['pagination_type'] = 'link'
                print(f"   ✓ Pagination: Link-based")
            elif soup.select('.pagination button, button.next'):
                structure['pagination_type'] = 'button'
                print(f"   ✓ Pagination: Button-based (JavaScript)")
            
            return structure
            
        except Exception as e:
            print(f"   ❌ Error analyzing site: {str(e)}")
            return {
                'has_ajax': False,
                'has_form': True,
                'form_action': self.base_url,
                'form_method': 'POST',
                'county_field_name': 'county',
                'result_selectors': ['table tbody tr', 'div.inspection-row'],
                'pagination_type': 'link',
            }
    
    def build_form_data(self, county_value: str, page: int = 1) -> Dict:
        """
        Build form data for search request.
        
        Args:
            county_value: Value for county field (e.g., "MI - Washtenaw")
            page: Page number
            
        Returns:
            Dictionary of form data
        """
        # Common form field patterns
        return {
            # County/State selection
            'county': county_value,
            'state_county': county_value,
            
            # Search filters (empty = show all)
            'restaurant_name': '',
            'business_name': '',
            'name': '',
            'address': '',
            'city': '',
            'license': '',
            'license_num': '',
            'license_number': '',
            
            # Date filters
            'from_date': '',
            'to_date': '',
            'date_from': '',
            'date_to': '',
            'start_date': '',
            'end_date': '',
            
            # Pagination
            'page': str(page),
            'page_num': str(page),
            'offset': str((page - 1) * 20),
            
            # Display options
            'limit': '50',
            'per_page': '50',
            'show_partial': '0',
            'partial': 'false',
            
            # Common hidden fields
            'search': '1',
            'submit': 'Search',
            'action': 'search',
        }
    
    def try_ajax_request(self, county_value: str, page: int = 1) -> Optional[List[Dict]]:
        """
        Attempt to fetch data via AJAX/API endpoint.
        
        Args:
            county_value: County selection value
            page: Page number
            
        Returns:
            List of records if successful, None otherwise
        """
        # Try common API endpoint patterns
        api_endpoints = [
            '/api/inspections/search',
            '/api/search',
            '/inspections/api/search',
            '/inspections/search',
        ]
        
        # Update headers for AJAX request
        ajax_headers = self.session.headers.copy()
        ajax_headers.update({
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        })
        
        form_data = self.build_form_data(county_value, page)
        
        for endpoint in api_endpoints:
            url = f"https://swordsolutions.com{endpoint}"
            
            try:
                response = self.session.post(
                    url,
                    data=form_data,
                    headers=ajax_headers,
                    timeout=30
                )
                
                if response.status_code == 200 and 'application/json' in response.headers.get('Content-Type', ''):
                    data = response.json()
                    records = self.parse_json_response(data)
                    if records:
                        print(f"   ✅ AJAX endpoint found: {endpoint}")
                        return records
                        
            except Exception:
                continue
        
        return None
    
    def parse_json_response(self, data: Dict) -> List[Dict]:
        """
        Parse JSON response from API.
        
        Args:
            data: JSON response data
            
        Returns:
            List of parsed inspection records
        """
        records = []
        
        # Try different JSON structures
        results = (
            data.get('results') or 
            data.get('data') or 
            data.get('inspections') or
            data.get('records') or
            []
        )
        
        if isinstance(data, list):
            results = data
        
        for item in results:
            try:
                record = {
                    'county': self.county,
                    'business_name': self.get_field(item, [
                        'business_name', 'name', 'establishment_name', 
                        'restaurant_name', 'facility_name'
                    ]),
                    'address': self.get_field(item, [
                        'address', 'location', 'street_address', 'full_address'
                    ]),
                    'inspection_date': self.normalize_date(self.get_field(item, [
                        'inspection_date', 'date', 'inspection_dt', 'visit_date'
                    ])),
                    'violations': self.get_field(item, [
                        'violations', 'violation_text', 'violation', 'findings'
                    ]),
                    'severity': self.normalize_severity(self.get_field(item, [
                        'severity', 'priority', 'level', 'risk'
                    ])),
                    'report_link': self.get_field(item, [
                        'report_link', 'pdf_url', 'report_url', 'document_url'
                    ]),
                    'license_number': self.get_field(item, [
                        'license', 'license_num', 'license_number', 'permit'
                    ]),
                    'type': self.get_field(item, [
                        'type', 'establishment_type', 'category', 'business_type'
                    ]),
                }
                
                if record['business_name']:
                    records.append(record)
                    
            except Exception as e:
                print(f"   ⚠️ Error parsing JSON item: {str(e)}")
                continue
        
        return records
    
    def parse_html_results(self, soup: BeautifulSoup, selectors: List[str]) -> List[Dict]:
        """
        Parse inspection results from HTML.
        
        Args:
            soup: BeautifulSoup object
            selectors: List of CSS selectors to try
            
        Returns:
            List of parsed inspection records
        """
        records = []
        rows = []
        
        # Try each selector
        for selector in selectors:
            rows = soup.select(selector)
            if rows and len(rows) > 2:
                break
        
        if not rows:
            print(f"   ⚠️ No results found with provided selectors")
            return []
        
        print(f"   📋 Found {len(rows)} potential result rows")
        
        for idx, row in enumerate(rows):
            try:
                # Skip header rows
                if row.name == 'tr' and row.find_parent('thead'):
                    continue
                
                record = {
                    'county': self.county,
                    'business_name': self.extract_text(row, [
                        '.business-name', '.name', '.establishment',
                        'td.name', 'td:nth-child(1)', 'h3', 'h4',
                        '[class*="name"]', '[class*="business"]'
                    ]),
                    'address': self.extract_text(row, [
                        '.address', '.location', 'td.address',
                        'td:nth-child(2)', '[class*="address"]',
                        '[class*="location"]'
                    ]),
                    'inspection_date': self.normalize_date(self.extract_text(row, [
                        '.date', '.inspection-date', 'td.date',
                        'td:nth-child(3)', '[class*="date"]'
                    ])),
                    'violations': self.extract_text(row, [
                        '.violations', '.findings', 'td.violations',
                        '[class*="violation"]', '[class*="finding"]'
                    ]),
                    'severity': self.normalize_severity(self.extract_text(row, [
                        '.severity', '.priority', '.risk', 'td.severity',
                        '[class*="severity"]', '[class*="priority"]'
                    ])),
                    'report_link': self.extract_link(row, [
                        'a.report', 'a.pdf', 'a[href*=".pdf"]',
                        'a[href*="report"]', '[class*="report"] a'
                    ]),
                    'license_number': self.extract_text(row, [
                        '.license', 'td.license', '[class*="license"]'
                    ]),
                    'type': self.extract_text(row, [
                        '.type', '.category', '[class*="type"]'
                    ]),
                }
                
                # Only add if we have minimum required data
                if record['business_name'] and len(record['business_name']) > 2:
                    records.append(record)
                    
            except Exception as e:
                print(f"   ⚠️ Error parsing row {idx}: {str(e)}")
                continue
        
        return records
    
    def scrape(self, county_value: str = "MI - Washtenaw", 
               max_pages: int = 10,
               download_pdfs: bool = False) -> List[Dict]:
        """
        Main scraping method - tries multiple approaches.
        
        Args:
            county_value: County selection value from dropdown
            max_pages: Maximum pages to scrape
            download_pdfs: Whether to download PDF reports
            
        Returns:
            List of all inspection records found
        """
        print(f"\n{'='*70}")
        print(f"🚀 Starting scrape for {self.county.upper()}")
        print(f"{'='*70}")
        
        all_records = []
        
        # Step 1: Detect site structure
        structure = self.detect_site_structure()
        
        # Step 2: Try AJAX first (fastest)
        print(f"\n📡 Attempting AJAX data retrieval...")
        current_page = 1
        
        while current_page <= max_pages:
            print(f"\n📄 Page {current_page}...")
            
            ajax_records = self.try_ajax_request(county_value, current_page)
            
            if ajax_records:
                all_records.extend(ajax_records)
                print(f"   ✅ Found {len(ajax_records)} records via AJAX")
                self.stats['pages_scraped'] += 1
                self.stats['records_found'] += len(ajax_records)
                
                if len(ajax_records) < 20:  # Likely last page
                    print(f"   📍 Reached last page")
                    break
                
                current_page += 1
                time.sleep(self.delay)
                continue
            
            # Step 3: Fall back to form submission + HTML parsing
            print(f"   ℹ️ Trying form submission...")
            
            form_data = self.build_form_data(county_value, current_page)
            
            try:
                response = self.session.post(
                    structure.get('form_action', self.base_url),
                    data=form_data,
                    timeout=30
                )
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Parse HTML results
                html_records = self.parse_html_results(
                    soup, 
                    structure.get('result_selectors', [
                        'table tbody tr',
                        'div.inspection-row',
                        'div.result-item'
                    ])
                )
                
                if html_records:
                    all_records.extend(html_records)
                    print(f"   ✅ Found {len(html_records)} records via HTML")
                    self.stats['pages_scraped'] += 1
                    self.stats['records_found'] += len(html_records)
                    
                    # Check for next page
                    next_link = soup.select_one('a.next, a[rel="next"], .pagination a.next')
                    if not next_link or 'disabled' in next_link.get('class', []):
                        print(f"   📍 No next page found")
                        break
                    
                    current_page += 1
                    time.sleep(self.delay)
                else:
                    print(f"   ⚠️ No results found on this page")
                    break
                    
            except Exception as e:
                print(f"   ❌ Error on page {current_page}: {str(e)}")
                self.stats['errors'] += 1
                break
        
        # Summary
        print(f"\n{'='*70}")
        print(f"✅ Scraping complete for {self.county.upper()}")
        print(f"{'='*70}")
        print(f"Pages scraped: {self.stats['pages_scraped']}")
        print(f"Total records: {self.stats['records_found']}")
        print(f"Errors: {self.stats['errors']}")
        
        return all_records
    
    # Utility methods
    
    def get_field(self, data: Dict, keys: List[str]) -> str:
        """Get first non-empty value from dict using multiple possible keys."""
        for key in keys:
            value = data.get(key)
            if value:
                return str(value)
        return ""
    
    def extract_text(self, element, selectors: List[str]) -> str:
        """Extract text using multiple CSS selectors."""
        for selector in selectors:
            try:
                found = element.select_one(selector)
                if found:
                    text = found.get_text(strip=True)
                    if text:
                        return text
            except:
                continue
        return ""
    
    def extract_link(self, element, selectors: List[str]) -> str:
        """Extract href using multiple CSS selectors."""
        for selector in selectors:
            try:
                found = element.select_one(selector)
                if found and found.has_attr('href'):
                    href = found['href']
                    # Make absolute URL
                    if href.startswith('/'):
                        href = 'https://swordsolutions.com' + href
                    elif not href.startswith('http'):
                        href = 'https://swordsolutions.com/' + href
                    return href
            except:
                continue
        return ""
    
    def normalize_date(self, date_str: str) -> str:
        """Convert date to ISO format (YYYY-MM-DD)."""
        if not date_str:
            return ""
        
        date_str = date_str.strip()
        
        # Try common formats
        formats = [
            '%m/%d/%Y', '%m-%d-%Y', '%m.%d.%Y',
            '%Y-%m-%d',
            '%B %d, %Y', '%b %d, %Y',
            '%m/%d/%y', '%m-%d-%y',
            '%d/%m/%Y', '%d-%m-%Y',
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        return date_str
    
    def normalize_severity(self, severity: str) -> str:
        """Normalize severity to standard values."""
        if not severity:
            return "medium"
        
        severity = severity.lower().strip()
        
        if any(word in severity for word in ['critical', 'crit', 'high', 'severe']):
            return "critical"
        elif any(word in severity for word in ['low', 'minor', 'routine']):
            return "low"
        else:
            return "medium"


def integrate_with_existing_scraper():
    """
    Integration script to use this scraper with your existing project structure.
    """
    print("\n🔧 Integration Mode")
    print("="*70)
    
    # Get project root
    project_root = Path(__file__).parent.parent
    output_dir = project_root / "inspection_scraper" / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize scraper
    scraper = SwordSolutionsScraper(county="washtenaw", delay=3)
    
    # Scrape data
    records = scraper.scrape(
        county_value="MI - Washtenaw",
        max_pages=10
    )
    
    if records:
        # Save to JSON
        output_file = output_dir / f"inspections_{scraper.county}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Saved {len(records)} records to:")
        print(f"   {output_file}")
        
        # Also save as CSV
        try:
            import csv
            csv_file = output_file.with_suffix('.csv')
            
            if records:
                fieldnames = list(records[0].keys())
                
                with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(records)
                
                print(f"   {csv_file}")
        except Exception as e:
            print(f"   ⚠️ CSV export failed: {str(e)}")
        
        return records
    else:
        print("\n❌ No records found")
        return []


# iPad-friendly usage
if __name__ == "__main__":
    print("\n" + "="*70)
    print("🍎 iPad-Compatible Sword Solutions Scraper")
    print("="*70)
    
    # Quick test mode - scrape just 2 pages
    print("\n🧪 Running quick test (2 pages)...")
    
    scraper = SwordSolutionsScraper(county="washtenaw", delay=2)
    
    test_records = scraper.scrape(
        county_value="MI - Washtenaw",
        max_pages=2
    )
    
    if test_records:
        print(f"\n✅ Test successful! Found {len(test_records)} records")
        print("\nSample record:")
        print(json.dumps(test_records[0], indent=2))
        
        # Save test results
        test_file = Path("sword_solutions_test.json")
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(test_records, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Test results saved to: {test_file}")
        
        print("\n" + "="*70)
        print("📱 To use on iPad:")
        print("="*70)
        print("1. Install dependencies:")
        print("   pip install requests beautifulsoup4 lxml")
        print("\n2. Run full scrape:")
        print("   python sword_solutions_scraper.py")
        print("\n3. Or integrate with existing project:")
        print("   python -c 'from sword_solutions_scraper import integrate_with_existing_scraper; integrate_with_existing_scraper()'")
    else:
        print("\n❌ Test failed - check site structure and network connection")
        print("\n💡 Tips:")
        print("   - Make sure you're connected to the internet")
        print("   - Check if swordsolutions.com is accessible")
        print("   - Try updating the county value format")
