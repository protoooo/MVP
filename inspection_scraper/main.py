"""
Main script to run inspection scrapers - Updated with testing mode
inspection_scraper/main.py

Usage:
    python main.py                    # Scrape all enabled counties
    python main.py --county washtenaw # Scrape specific county
    python main.py --test             # Test mode (1 page only)
    python main.py --analyze          # Just analyze site structure
"""

import json
import csv
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from scrapers import SwordSolutionsScraper


def load_config():
    """Load county configuration"""
    config_path = Path(__file__).parent / 'config' / 'counties.json'
    with open(config_path, 'r') as f:
        config = json.load(f)
    # Filter out comment keys
    return {k: v for k, v in config.items() if not k.startswith('_')}


def analyze_mode(county_name: str):
    """Run site structure analysis only"""
    print(f"\n{'='*70}")
    print(f"🔬 ANALYSIS MODE - {county_name.upper()}")
    print(f"{'='*70}")
    
    config = load_config()
    county_config = config.get(county_name)
    
    if not county_config:
        print(f"❌ County '{county_name}' not found in config")
        return
    
    scraper = SwordSolutionsScraper(
        county=county_name,
        delay=county_config.get('settings', {}).get('delay', 3)
    )
    
    # Just run structure detection
    structure = scraper.detect_site_structure()
    
    print(f"\n{'='*70}")
    print("📊 ANALYSIS RESULTS")
    print(f"{'='*70}")
    print(f"\nForm detected: {structure['has_form']}")
    print(f"Form action: {structure.get('form_action')}")
    print(f"Form method: {structure.get('form_method')}")
    print(f"County field: {structure.get('county_field')}")
    print(f"\nResult selectors found: {len(structure.get('result_selectors', []))}")
    for selector in structure.get('result_selectors', []):
        print(f"  - {selector}")
    
    print(f"\n{'='*70}")
    print("💡 RECOMMENDATIONS")
    print(f"{'='*70}")
    
    if not structure['has_form']:
        print("⚠️  No search form detected")
        print("   - Check if site requires JavaScript")
        print("   - Verify URL is correct")
    
    if not structure.get('result_selectors'):
        print("⚠️  No result selectors found")
        print("   - Site may require form submission first")
        print("   - Try running a test scrape")
    
    if structure['has_form'] and structure.get('result_selectors'):
        print("✅ Site structure looks good!")
        print("   - Ready to run full scrape")
        print(f"   - Run: python main.py --county {county_name}")


def test_mode(county_name: str):
    """Run in test mode (1 page only)"""
    print(f"\n{'='*70}")
    print(f"🧪 TEST MODE - {county_name.upper()}")
    print(f"{'='*70}")
    print("Only scraping 1 page as a test\n")
    
    config = load_config()
    county_config = config.get(county_name)
    
    if not county_config:
        print(f"❌ County '{county_name}' not found in config")
        return []
    
    scraper = SwordSolutionsScraper(
        county=county_name,
        delay=2  # Faster for testing
    )
    
    records = scraper.scrape(
        county_value=county_config['county_value'],
        max_pages=1  # Only 1 page
    )
    
    if records:
        print(f"\n{'='*70}")
        print("📋 SAMPLE RECORDS")
        print(f"{'='*70}")
        
        for i, record in enumerate(records[:3], 1):  # Show first 3
            print(f"\n{i}. {record.get('business_name', 'Unknown')}")
            print(f"   Address: {record.get('address', 'N/A')}")
            print(f"   Date: {record.get('inspection_date', 'N/A')}")
            print(f"   Severity: {record.get('severity', 'N/A')}")
        
        if len(records) > 3:
            print(f"\n... and {len(records) - 3} more")
        
        # Save test results
        output_dir = Path(__file__).parent / 'outputs'
        output_dir.mkdir(exist_ok=True)
        
        test_file = output_dir / f'test_{county_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(test_file, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Test results saved to: {test_file}")
    
    return records


def full_scrape(county_names: list = None):
    """Run full scraping for specified counties"""
    config = load_config()
    
    # Get counties to scrape
    if county_names:
        counties_to_scrape = {k: v for k, v in config.items() if k in county_names}
    else:
        # All enabled counties
        counties_to_scrape = {k: v for k, v in config.items() if v.get('enabled', False)}
    
    if not counties_to_scrape:
        print("❌ No counties to scrape")
        print("💡 Enable counties in config/counties.json or specify with --county")
        return
    
    print(f"\n{'='*70}")
    print("🚀 FULL SCRAPE MODE")
    print(f"{'='*70}")
    print(f"\nCounties to scrape: {', '.join(counties_to_scrape.keys())}")
    print()
    
    all_records = []
    
    # Scrape each county
    for county_name, county_config in counties_to_scrape.items():
        print(f"\n{'='*70}")
        print(f"📍 {county_name.upper()}")
        print(f"{'='*70}")
        
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
            
        except Exception as e:
            print(f"❌ Error scraping {county_name}: {str(e)}")
            continue
    
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
            fieldnames = list(all_records[0].keys())
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(all_records)
        
        print(f"\n{'='*70}")
        print(f"✅ SCRAPING COMPLETE")
        print(f"{'='*70}")
        print(f"Total records: {len(all_records)}")
        print(f"\nSaved to:")
        print(f"  📄 {json_file}")
        print(f"  📄 {csv_file}")
        print(f"\n💡 Next step: Sync to database")
        print(f"   Run: npm run sync-inspections")
    else:
        print("\n❌ No records found")


def main():
    parser = argparse.ArgumentParser(
        description='Michigan Inspection Scraper',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                           # Scrape all enabled counties
  python main.py --county washtenaw        # Scrape specific county
  python main.py --test --county washtenaw # Test mode (1 page)
  python main.py --analyze --county wayne  # Analyze site structure
        """
    )
    
    parser.add_argument(
        '--county',
        type=str,
        help='Specific county to scrape (washtenaw, wayne, oakland)'
    )
    
    parser.add_argument(
        '--test',
        action='store_true',
        help='Test mode - only scrape 1 page'
    )
    
    parser.add_argument(
        '--analyze',
        action='store_true',
        help='Analyze site structure only (no scraping)'
    )
    
    args = parser.parse_args()
    
    # Determine mode
    if args.analyze:
        county = args.county or 'washtenaw'
        analyze_mode(county)
    elif args.test:
        county = args.county or 'washtenaw'
        test_mode(county)
    else:
        counties = [args.county] if args.county else None
        full_scrape(counties)


if __name__ == '__main__':
    main()
