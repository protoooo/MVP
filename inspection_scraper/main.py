"""
Main script to run all county inspection scrapers.
UPDATED: Now supports Sword Solutions JavaScript-based portals
"""

import json
import csv
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from scrapers import SwordSolutionsScraper
from utils.logger import setup_logger

logger = setup_logger()

def load_config():
    """Load county configuration."""
    config_path = Path(__file__).parent / 'config' / 'counties.json'
    with open(config_path, 'r') as f:
        config = json.load(f)
    return {k: v for k, v in config.items() if not k.startswith('_')}

def main():
    """Run all enabled county scrapers."""
    logger.info("="*70)
    logger.info("🚀 MULTI-COUNTY INSPECTION SCRAPER")
    logger.info("="*70)
    
    config = load_config()
    all_records = []
    
    # Get enabled counties
    enabled = {k: v for k, v in config.items() if v.get('enabled', True)}
    
    logger.info(f"\nEnabled counties: {', '.join(enabled.keys())}")
    
    # Scrape each county
    for county_name, county_config in enabled.items():
        logger.info(f"\n{'='*70}")
        logger.info(f"Scraping {county_name.upper()}")
        logger.info(f"{'='*70}")
        
        try:
            scraper = SwordSolutionsScraper(
                county=county_name,
                delay=county_config.get('settings', {}).get('delay', 3)
            )
            
            records = scraper.scrape(
                county_value=county_config['county_value'],
                max_pages=county_config.get('settings', {}).get('max_pages', 10)
            )
            
            all_records.extend(records)
            logger.info(f"✅ Found {len(records)} records")
            
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
    
    # Save results
    if all_records:
        output_dir = Path(__file__).parent / 'outputs'
        output_dir.mkdir(exist_ok=True)
        
        # JSON
        json_file = output_dir / 'inspections.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(all_records, f, indent=2, ensure_ascii=False)
        
        # CSV
        csv_file = output_dir / 'inspections.csv'
        if all_records:
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=list(all_records[0].keys()))
                writer.writeheader()
                writer.writerows(all_records)
        
        logger.info(f"\n{'='*70}")
        logger.info(f"✅ COMPLETE - {len(all_records)} total records")
        logger.info(f"{'='*70}")
        logger.info(f"Saved to:")
        logger.info(f"  • {json_file}")
        logger.info(f"  • {csv_file}")
    else:
        logger.warning("❌ No records found")

if __name__ == '__main__':
    main()
