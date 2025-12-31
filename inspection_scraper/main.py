"""
Main script to run all county inspection scrapers.
UPDATED: Now supports Sword Solutions JavaScript-based portals
"""

import json
import csv
import os
import sys
from typing import List, Dict
from pathlib import Path

# Add the inspection_scraper directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from scrapers import SwordSolutionsScraper
from utils.logger import setup_logger


# SQL Schema for PostgreSQL/Supabase
SQL_SCHEMA = """
-- SQL Schema for PostgreSQL/Supabase Database

CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    county TEXT NOT NULL,
    business_name TEXT NOT NULL,
    address TEXT,
    inspection_date DATE,
    violations TEXT,
    severity TEXT,
    report_link TEXT,
    license_number TEXT,
    type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inspections_county ON inspections(county);
CREATE INDEX IF NOT EXISTS idx_inspections_business_name ON inspections(business_name);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_severity ON inspections(severity);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
CREATE TRIGGER update_inspections_updated_at 
    BEFORE UPDATE ON inspections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
"""


class InspectionScraperOrchestrator:
    """
    Orchestrates scraping across all counties and manages output.
    Updated to support multiple scraper types.
    """
    
    def __init__(self, output_dir: str = 'outputs', download_pdfs: bool = False):
        """
        Initialize the orchestrator.
        
        Args:
            output_dir: Directory to save output files (default: 'outputs')
            download_pdfs: Whether to download PDFs (default: False)
        """
        self.logger = setup_logger()
        self.output_dir = output_dir
        self.download_pdfs = download_pdfs
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Load configuration
        self.config = self.load_config()
    
    def load_config(self) -> Dict:
        """Load county configuration from JSON file."""
        config_path = Path(__file__).parent / 'config' / 'counties.json'
        
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Filter out metadata
            return {k: v for k, v in config.items() if not k.startswith('_')}
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {}
    
    def print_sql_schema(self):
        """Print the SQL schema for database setup."""
        self.logger.info("=" * 80)
        self.logger.info("SQL SCHEMA FOR POSTGRESQL/SUPABASE")
        self.logger.info("=" * 80)
        print(SQL_SCHEMA)
        self.logger.info("=" * 80)
    
    def create_scraper(self, county_name: str, county_config: Dict):
        """
        Create appropriate scraper based on configuration.
        
        Args:
            county_name: Name of the county
            county_config: Configuration dictionary for the county
            
        Returns:
            Scraper instance
        """
        scraper_type = county_config.get('scraper_type', 'base')
        settings = county_config.get('settings', {})
        delay = settings.get('delay', 3)
        
        if scraper_type == 'sword_solutions':
            return SwordSolutionsScraper(
                county=county_name,
                delay=delay
            )
        else:
            # Fallback to base scraper (your original implementation)
            from scrapers.base_scraper import BaseScraper
            return BaseScraper(county_name, county_config, delay)
    
    def run_all_scrapers(self) -> List[Dict[str, str]]:
        """
        Run scrapers for all enabled counties.
        
        Returns:
            Combined list of all inspection records
        """
        all_records = []
        
        # Filter enabled counties
        enabled_counties = {
            name: config 
            for name, config in self.config.items() 
            if config.get('enabled', True)
        }
        
        if not enabled_counties:
            self.logger.warning("No enabled counties found in configuration")
            return []
        
        self.logger.info(f"\n{'=' * 60}")
        self.logger.info(f"Found {len(enabled_counties)} enabled counties:")
        for name in enabled_counties.keys():
            self.logger.info(f"  • {name.capitalize()}")
        self.logger.info(f"{'=' * 60}")
        
        # Run each scraper
        for county_name, county_config in enabled_counties.items():
            self.logger.info(f"\n{'=' * 60}")
            self.logger.info(f"Starting scrape for {county_name.capitalize()} County")
            self.logger.info(f"Scraper type: {county_config.get('scraper_type', 'base')}")
            self.logger.info(f"{'=' * 60}")
            
            try:
                # Create scraper
                scraper = self.create_scraper(county_name, county_config)
                
                # Run scraper
                if isinstance(scraper, SwordSolutionsScraper):
                    # Sword Solutions scraper
                    county_value = county_config.get('county_value', f'MI - {county_name.capitalize()}')
                    max_pages = county_config.get('settings', {}).get('max_pages', 10)
                    
                    records = scraper.scrape(
                        county_value=county_value,
                        max_pages=max_pages,
                        download_pdfs=self.download_pdfs
                    )
                else:
                    # Base scraper
                    records = scraper.scrape(download_pdfs=self.download_pdfs)
                
                all_records.extend(records)
                self.logger.info(f"✅ Successfully scraped {len(records)} records from {county_name.capitalize()}")
                
            except Exception as e:
                self.logger.error(f"❌ Error scraping {county_name}: {str(e)}")
                continue
        
        return all_records
    
    def save_to_json(self, records: List[Dict[str, str]], filename: str = 'inspections.json'):
        """
        Save records to JSON file.
        
        Args:
            records: List of inspection records
            filename: Output filename (default: 'inspections.json')
        """
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
            self.logger.info(f"💾 Saved {len(records)} records to {filepath}")
        except Exception as e:
            self.logger.error(f"❌ Error saving JSON: {str(e)}")
    
    def save_to_csv(self, records: List[Dict[str, str]], filename: str = 'inspections.csv'):
        """
        Save records to CSV file.
        
        Args:
            records: List of inspection records
            filename: Output filename (default: 'inspections.csv')
        """
        if not records:
            self.logger.warning("No records to save to CSV")
            return
        
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            # Get all unique field names from records
            fieldnames = set()
            for record in records:
                fieldnames.update(record.keys())
            fieldnames = sorted(list(fieldnames))
            
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(records)
            
            self.logger.info(f"💾 Saved {len(records)} records to {filepath}")
        except Exception as e:
            self.logger.error(f"❌ Error saving CSV: {str(e)}")
    
    def run(self):
        """
        Main execution method - run all scrapers and save results.
        """
        self.logger.info("=" * 80)
        self.logger.info("🚀 MULTI-COUNTY INSPECTION SCRAPER - ENHANCED EDITION")
        self.logger.info("=" * 80)
        
        # Print SQL schema
        self.print_sql_schema()
        
        # Run scrapers
        self.logger.info("\n🔄 Starting scraping process...")
        records = self.run_all_scrapers()
        
        # Save results
        self.logger.info(f"\n{'=' * 60}")
        self.logger.info("💾 SAVING RESULTS")
        self.logger.info(f"{'=' * 60}")
        
        if records:
            self.save_to_json(records)
            self.save_to_csv(records)
            
            # Print summary
            self.logger.info(f"\n{'=' * 60}")
            self.logger.info("📊 SCRAPING SUMMARY")
            self.logger.info(f"{'=' * 60}")
            self.logger.info(f"Total records scraped: {len(records)}")
            
            # Count by county
            county_counts = {}
            for record in records:
                county = record.get('county', 'unknown')
                county_counts[county] = county_counts.get(county, 0) + 1
            
            for county, count in sorted(county_counts.items()):
                self.logger.info(f"  • {county.capitalize()}: {count} records")
            
            # Count by severity
            severity_counts = {}
            for record in records:
                severity = record.get('severity', 'unknown')
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            self.logger.info(f"\n📈 By Severity:")
            for severity, count in sorted(severity_counts.items()):
                self.logger.info(f"  • {severity.capitalize()}: {count} records")
        else:
            self.logger.warning("❌ No records were scraped from any county")
        
        self.logger.info(f"\n{'=' * 60}")
        self.logger.info("✅ SCRAPING COMPLETE")
        self.logger.info(f"{'=' * 60}")
        
        # Next steps
        self.logger.info("\n📋 Next Steps:")
        self.logger.info("  1. Review output files in outputs/ directory")
        self.logger.info("  2. Sync to database: node scripts/sync-inspections.js")
        self.logger.info("  3. View on dashboard: http://localhost:3000")


def main():
    """
    Main entry point for the scraper.
    """
    # Configuration
    DOWNLOAD_PDFS = False  # Set to True to download PDF reports
    OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'outputs')
    
    # Run orchestrator
    orchestrator = InspectionScraperOrchestrator(
        output_dir=OUTPUT_DIR,
        download_pdfs=DOWNLOAD_PDFS
    )
    orchestrator.run()


if __name__ == '__main__':
    main()
