#!/usr/bin/env python
"""
Example usage of the inspection scraper.
Demonstrates basic usage and customization options.
"""

import sys
import os

# Add the inspection_scraper directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from scrapers import WashtenawScraper, WayneScraper, OaklandScraper
from utils import PDFHandler, DataCleaner, setup_logger


def example_single_county():
    """
    Example: Scrape a single county.
    """
    print("=" * 80)
    print("EXAMPLE 1: Scraping a Single County")
    print("=" * 80)
    
    # Initialize scraper for Washtenaw County
    scraper = WashtenawScraper(delay=3)
    
    # Run the scrape (without PDF downloads)
    records = scraper.scrape(download_pdfs=False)
    
    print(f"\nScraped {len(records)} records from Washtenaw County")
    
    # Display first few records
    for i, record in enumerate(records[:3], 1):
        print(f"\nRecord {i}:")
        print(f"  Business: {record.get('business_name')}")
        print(f"  Address: {record.get('address')}")
        print(f"  Date: {record.get('inspection_date')}")
        print(f"  Severity: {record.get('severity')}")


def example_with_pdf_download():
    """
    Example: Scrape with PDF downloads enabled.
    """
    print("\n" + "=" * 80)
    print("EXAMPLE 2: Scraping with PDF Downloads")
    print("=" * 80)
    
    # Initialize scraper
    scraper = WashtenawScraper(delay=3)
    
    # Run the scrape WITH PDF downloads
    records = scraper.scrape(download_pdfs=True)
    
    print(f"\nScraped {len(records)} records and downloaded {len(records)} PDFs")


def example_data_cleaning():
    """
    Example: Using data cleaning utilities.
    """
    print("\n" + "=" * 80)
    print("EXAMPLE 3: Data Cleaning")
    print("=" * 80)
    
    cleaner = DataCleaner()
    
    # Sample messy data
    messy_record = {
        'business_name': "  JOE'S   RESTAURANT  ,  ",
        'address': '123 Main St. Suite 100',
        'inspection_date': '01/15/2024',
        'violations': '  Multiple  issues  ',
        'severity': 'HIGH'
    }
    
    print("\nOriginal record:")
    for key, value in messy_record.items():
        print(f"  {key}: '{value}'")
    
    # Clean the record
    clean_record = cleaner.clean_record(messy_record)
    
    print("\nCleaned record:")
    for key, value in clean_record.items():
        print(f"  {key}: '{value}'")


def example_custom_delay():
    """
    Example: Using custom rate limiting.
    """
    print("\n" + "=" * 80)
    print("EXAMPLE 4: Custom Rate Limiting")
    print("=" * 80)
    
    # Use a longer delay to be more respectful of servers
    scraper = WashtenawScraper(delay=5)  # 5 seconds between requests
    
    print(f"Scraper configured with {scraper.delay} second delay between requests")


def example_multiple_counties():
    """
    Example: Scraping multiple counties sequentially.
    """
    print("\n" + "=" * 80)
    print("EXAMPLE 5: Multiple Counties")
    print("=" * 80)
    
    all_records = []
    
    counties = [
        ('Washtenaw', WashtenawScraper(delay=3)),
        ('Wayne', WayneScraper(delay=3)),
        ('Oakland', OaklandScraper(delay=3))
    ]
    
    for county_name, scraper in counties:
        print(f"\nScraping {county_name} County...")
        records = scraper.scrape(download_pdfs=False)
        all_records.extend(records)
        print(f"  Found {len(records)} records")
    
    print(f"\nTotal records from all counties: {len(all_records)}")


def main():
    """
    Run all examples.
    """
    print("\n" + "=" * 80)
    print("INSPECTION SCRAPER - USAGE EXAMPLES")
    print("=" * 80)
    print("\nNote: These examples demonstrate the API. ")
    print("The actual scraping will fail if the URLs in config/counties.json")
    print("are not updated with real county inspection report URLs.")
    print("=" * 80)
    
    # Note: Commenting out actual scraping to avoid errors with placeholder URLs
    # Uncomment these when you have real URLs configured
    
    # example_single_county()
    # example_with_pdf_download()
    example_data_cleaning()
    example_custom_delay()
    # example_multiple_counties()
    
    print("\n" + "=" * 80)
    print("For full scraping, run: python main.py")
    print("=" * 80)


if __name__ == '__main__':
    main()
