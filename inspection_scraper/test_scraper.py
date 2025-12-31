"""
Quick test script to verify Sword Solutions scraper is working
inspection_scraper/test_scraper.py

Run this to quickly test if your scraper can access and parse the site.
"""

import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from scrapers.sword_solutions import SwordSolutionsScraper


def test_connection():
    """Test basic connection to Sword Solutions site"""
    print("="*70)
    print("🧪 Testing Sword Solutions Scraper")
    print("="*70)
    
    print("\n1️⃣ Testing site connection...")
    
    try:
        scraper = SwordSolutionsScraper(county='washtenaw', delay=2)
        
        # Test 1: Can we reach the site?
        import requests
        response = scraper.session.get(scraper.base_url, timeout=10)
        if response.status_code == 200:
            print("   ✅ Site is reachable")
        else:
            print(f"   ⚠️ Site returned status {response.status_code}")
            return False
        
        # Test 2: Can we detect the form structure?
        print("\n2️⃣ Analyzing site structure...")
        structure = scraper.detect_site_structure()
        
        if structure['has_form']:
            print("   ✅ Search form detected")
        else:
            print("   ❌ No search form found")
            return False
        
        if structure.get('result_selectors'):
            print(f"   ✅ Found {len(structure['result_selectors'])} result selectors")
        else:
            print("   ⚠️ No result selectors found yet (normal before search)")
        
        # Test 3: Try a minimal search
        print("\n3️⃣ Testing search functionality...")
        records = scraper.scrape(max_pages=1)
        
        if records:
            print(f"   ✅ Successfully scraped {len(records)} records!")
            print("\n📋 Sample record:")
            sample = records[0]
            print(f"   Name: {sample.get('business_name', 'N/A')}")
            print(f"   Address: {sample.get('address', 'N/A')}")
            print(f"   Date: {sample.get('inspection_date', 'N/A')}")
            print(f"   Severity: {sample.get('severity', 'N/A')}")
            
            # Save test output
            import json
            output_dir = Path(__file__).parent / 'outputs'
            output_dir.mkdir(exist_ok=True)
            test_file = output_dir / 'test_output.json'
            
            with open(test_file, 'w', encoding='utf-8') as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Full test results saved to: {test_file}")
            return True
        else:
            print("   ❌ No records found")
            print("\n🔍 Troubleshooting:")
            print("   - The county value might be incorrect")
            print("   - The site structure may have changed")
            print("   - The form fields might need adjustment")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        print("\n📋 Full traceback:")
        traceback.print_exc()
        return False


def run_diagnostics():
    """Run comprehensive diagnostics"""
    print("\n" + "="*70)
    print("🔧 DIAGNOSTICS")
    print("="*70)
    
    print("\n📦 Checking dependencies...")
    
    required = ['requests', 'beautifulsoup4']
    missing = []
    
    for pkg in required:
        try:
            __import__(pkg.replace('-', '_'))
            print(f"   ✅ {pkg}")
        except ImportError:
            print(f"   ❌ {pkg} (missing)")
            missing.append(pkg)
    
    if missing:
        print(f"\n⚠️ Install missing packages:")
        print(f"   pip install {' '.join(missing)}")
        return False
    
    print("\n📁 Checking configuration...")
    
    config_path = Path(__file__).parent / 'config' / 'counties.json'
    if config_path.exists():
        print(f"   ✅ Config file found")
        
        import json
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        counties = [k for k in config.keys() if not k.startswith('_')]
        print(f"   ✅ {len(counties)} counties configured: {', '.join(counties)}")
    else:
        print(f"   ❌ Config file not found at {config_path}")
        return False
    
    return True


if __name__ == '__main__':
    print("\n" + "🚀 Sword Solutions Scraper Test" + "\n")
    
    # Run diagnostics first
    if not run_diagnostics():
        print("\n❌ Diagnostics failed - fix issues before testing")
        sys.exit(1)
    
    # Test the scraper
    success = test_connection()
    
    print("\n" + "="*70)
    if success:
        print("✅ TEST PASSED - Scraper is working!")
        print("="*70)
        print("\n💡 Next steps:")
        print("   1. Run full scrape: python main.py --county washtenaw")
        print("   2. Sync to database: npm run sync-inspections")
    else:
        print("❌ TEST FAILED - Scraper needs troubleshooting")
        print("="*70)
        print("\n💡 Troubleshooting steps:")
        print("   1. Check if swordsolutions.com/inspections/ is accessible")
        print("   2. Verify county value matches site dropdown options")
        print("   3. Run analysis mode: python main.py --analyze --county washtenaw")
        sys.exit(1)
