"""
Enhanced Sword Solutions Scraper - Updated for actual site structure
inspection_scraper/scrapers/sword_solutions.py
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
    Scraper for Sword Solutions inspection portal at swordsolutions.com/inspections/
    Handles form-based county selection and result parsing
    """
    
    def __init__(self, county: str = "washtenaw", delay: int = 3):
        self.county = county.lower()
        self.delay = delay
        self.base_url = "https://swordsolutions.com/inspections/"
        
        # Load county config
        config_path = Path(__file__).parent.parent / 'config' / 'counties.json'
        with open(config_path, 'r') as f:
            configs = json.load(f)
        
        self.config = configs.get(self.county, {})
        if not self.config:
            raise ValueError(f"No configuration found for county: {county}")
        
        # Initialize session with realistic headers
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
        })
        
        # Statistics
        self.stats = {
            'pages_scraped': 0,
            'records_found': 0,
            'errors': 0,
        }
    
    def detect_site_structure(self) -> Dict:
        """
        Analyze the Sword Solutions site to understand its structure
        """
        print(f"\n🔍 Analyzing Sword Solutions site structure...")
        
        try:
            response = self.session.get(self.base_url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            structure = {
                'has_form': False,
                'form_action': None,
                'form_method': 'POST',
                'county_field': None,
                'result_selectors': [],
            }
            
            # Find the search form
            forms = soup.find_all('form')
            print(f"   Found {len(forms)} form(s)")
            
            for form in forms:
                # Look for county/state selector
                selects = form.find_all('select')
                for select in selects:
                    name = select.get('name', '').lower()
                    if 'county' in name or 'state' in name or 'location' in name:
                        structure['has_form'] = True
                        structure['form_action'] = form.get('action') or self.base_url
                        structure['form_method'] = form.get('method', 'POST').upper()
                        structure['county_field'] = select.get('name')
                        
                        # List available options
                        options = select.find_all('option')
                        print(f"   ✓ Found county field: {structure['county_field']}")
                        print(f"   ✓ Available options ({len(options)}):")
                        for opt in options[:10]:  # Show first 10
                            value = opt.get('value', '')
                            text = opt.get_text(strip=True)
                            if value:
                                print(f"      - {text} ({value})")
            
            # Identify result container selectors
            # Common patterns in Sword Solutions sites
            possible_containers = [
                'table.results tbody tr',
                'table.inspections tbody tr',
                'div.inspection-result',
                'div.result-row',
                'table tbody tr',
                '.inspection-list tr',
            ]
            
            for selector in possible_containers:
                elements = soup.select(selector)
                if len(elements) > 2:  # Need at least 3 to be results
                    structure['result_selectors'].append(selector)
                    print(f"   ✓ Possible results: {selector} ({len(elements)} rows)")
            
            return structure
            
        except Exception as e:
            print(f"   ❌ Error analyzing site: {str(e)}")
            # Return defaults
            return {
                'has_form': True,
                'form_action': self.base_url,
                'form_method': 'POST',
                'county_field': 'county',
                'result_selectors': ['table tbody tr'],
            }
    
    def build_search_payload(self, page: int = 1) -> Dict:
        """
        Build the form payload for county search
        """
        county_value = self.config.get('county_value', f"MI - {self.county.title()}")
        form_fields = self.config.get('form_fields', {})
        
        # Merge with page-specific params
        payload = {**form_fields}
        payload['page'] = str(page)
        
        # Ensure county is set
        if 'county' not in payload:
            payload['county'] = county_value
        
        return payload
    
    def scrape(self, county_value: str = None, max_pages: int = 10) -> List[Dict]:
        """
        Main scraping method
        
        Args:
            county_value: Override county value (uses config if not provided)
            max_pages: Maximum pages to scrape
            
        Returns:
            List of inspection records
        """
        print(f"\n{'='*70}")
        print(f"🚀 Starting scrape for {self.county.upper()}")
        print(f"{'='*70}")
        
        all_records = []
        
        # Step 1: Analyze site structure
        structure = self.detect_site_structure()
        
        if not structure['has_form']:
            print("\n❌ Could not find search form on page")
            print("💡 The site structure may have changed")
            return []
        
        # Step 2: Get initial page to set up session
        print(f"\n📡 Loading initial page...")
        try:
            response = self.session.get(self.base_url, timeout=30)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract any hidden form fields (CSRF tokens, etc.)
            hidden_fields = {}
            form = soup.find('form')
            if form:
                for hidden in form.find_all('input', type='hidden'):
                    name = hidden.get('name')
                    value = hidden.get('value')
                    if name:
                        hidden_fields[name] = value
                        print(f"   Found hidden field: {name}")
            
        except Exception as e:
            print(f"   ⚠️ Could not load initial page: {str(e)}")
            hidden_fields = {}
        
        # Step 3: Search by county and scrape results
        current_page = 1
        
        while current_page <= max_pages:
            print(f"\n📄 Page {current_page}...")
            
            try:
                # Build search payload
                payload = self.build_search_payload(current_page)
                payload.update(hidden_fields)  # Add any hidden fields
                
                # Submit search form
                form_action = structure['form_action']
                if not form_action.startswith('http'):
                    form_action = self.base_url
                
                response = self.session.post(
                    form_action,
                    data=payload,
                    timeout=30,
                    allow_redirects=True
                )
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Parse results using detected selectors
                records = self.parse_results(soup, structure['result_selectors'])
                
                if records:
                    all_records.extend(records)
                    print(f"   ✅ Found {len(records)} records")
                    self.stats['pages_scraped'] += 1
                    self.stats['records_found'] += len(records)
                    
                    # Check for next page
                    has_next = self.has_next_page(soup)
                    if not has_next:
                        print(f"   📍 No more pages")
                        break
                    
                    current_page += 1
                    time.sleep(self.delay)
                else:
                    print(f"   ⚠️ No results on this page")
                    break
                    
            except Exception as e:
                print(f"   ❌ Error on page {current_page}: {str(e)}")
                self.stats['errors'] += 1
                break
        
        # Print summary
        print(f"\n{'='*70}")
        print(f"✅ Scraping complete for {self.county.upper()}")
        print(f"{'='*70}")
        print(f"Pages scraped: {self.stats['pages_scraped']}")
        print(f"Total records: {self.stats['records_found']}")
        print(f"Errors: {self.stats['errors']}")
        
        return all_records
    
    def parse_results(self, soup: BeautifulSoup, selectors: List[str]) -> List[Dict]:
        """
        Parse inspection results from HTML
        """
        rows = []
        
        # Try each selector
        for selector in selectors:
            rows = soup.select(selector)
            if len(rows) > 2:  # Need meaningful results
                break
        
        if not rows:
            # Try fallback selectors
            fallback_selectors = [
                'table tr',
                '.result',
                '.inspection',
                '[class*="result"]',
            ]
            for selector in fallback_selectors:
                rows = soup.select(selector)
                if len(rows) > 2:
                    break
        
        if not rows:
            return []
        
        print(f"   📋 Parsing {len(rows)} rows...")
        
        records = []
        selector_config = self.config.get('selectors', {})
        
        for idx, row in enumerate(rows):
            # Skip header rows
            if row.find_parent('thead') or row.find('th'):
                continue
            
            try:
                record = {
                    'county': self.county,
                    'business_name': self.extract_text(row, selector_config.get('business_name', 'td:first-child')),
                    'address': self.extract_text(row, selector_config.get('address', 'td:nth-child(2)')),
                    'inspection_date': self.normalize_date(
                        self.extract_text(row, selector_config.get('date', 'td:nth-child(3)'))
                    ),
                    'violations': self.extract_text(row, selector_config.get('violations', 'td:nth-child(4)')),
                    'severity': self.normalize_severity(
                        self.extract_text(row, selector_config.get('severity', 'td:nth-child(5)'))
                    ),
                    'type': self.extract_text(row, selector_config.get('type', '')),
                    'report_link': self.extract_link(row, selector_config.get('report_link', 'a')),
                }
                
                # Only add if we have minimum data
                if record['business_name'] and len(record['business_name']) > 2:
                    records.append(record)
                    
            except Exception as e:
                continue
        
        return records
    
    def has_next_page(self, soup: BeautifulSoup) -> bool:
        """
        Check if there's a next page available
        """
        # Look for pagination indicators
        next_indicators = [
            'a.next',
            'a[rel="next"]',
            'button.next',
            'a:contains("Next")',
            'a:contains("›")',
            'a:contains("→")',
        ]
        
        for selector in next_indicators:
            try:
                next_link = soup.select_one(selector.split(':')[0])  # Basic selector part
                if next_link and 'disabled' not in next_link.get('class', []):
                    return True
            except:
                continue
        
        return False
    
    # Utility methods
    
    def extract_text(self, element, selector: str) -> str:
        """Extract text from element using CSS selector"""
        if not selector:
            return ""
        
        try:
            # Try multiple selector formats
            for sel in selector.split(','):
                sel = sel.strip()
                found = element.select_one(sel)
                if found:
                    return found.get_text(strip=True)
        except:
            pass
        
        return ""
    
    def extract_link(self, element, selector: str) -> str:
        """Extract href from element"""
        if not selector:
            return ""
        
        try:
            for sel in selector.split(','):
                sel = sel.strip()
                found = element.select_one(sel)
                if found and found.has_attr('href'):
                    href = found['href']
                    # Make absolute URL
                    if href.startswith('/'):
                        return 'https://swordsolutions.com' + href
                    elif not href.startswith('http'):
                        return 'https://swordsolutions.com/' + href
                    return href
        except:
            pass
        
        return ""
    
    def normalize_date(self, date_str: str) -> str:
        """Convert date to ISO format"""
        if not date_str:
            return ""
        
        date_str = date_str.strip()
        
        formats = [
            '%m/%d/%Y', '%m-%d-%Y', '%Y-%m-%d',
            '%B %d, %Y', '%b %d, %Y',
            '%m/%d/%y', '%d/%m/%Y',
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        return date_str
    
    def normalize_severity(self, severity: str) -> str:
        """Normalize severity to standard values"""
        if not severity:
            return "medium"
        
        severity = severity.lower().strip()
        
        if any(word in severity for word in ['critical', 'crit', 'high', 'severe', 'red']):
            return "critical"
        elif any(word in severity for word in ['low', 'minor', 'routine', 'green']):
            return "low"
        else:
            return "medium"
