"""
Main script to run all county inspection scrapers.
Coordinates scraping across multiple counties and outputs combined results.
"""

import json
import csv
import os
import sys
from typing import List, Dict

# Add the inspection_scraper directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from scrapers import WashtenawScraper, WayneScraper, OaklandScraper
from utils.logger import setup_logger


# SQL Schema for PostgreSQL/Supabase
SQL_SCHEMA = """
-- SQL Schema for PostgreSQL/Supabase Database

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

-- Create indexes for better query performance
CREATE INDEX idx_inspections_county ON inspections(county);
CREATE INDEX idx_inspections_business_name ON inspections(business_name);
CREATE INDEX idx_inspections_date ON inspections(inspection_date);
CREATE INDEX idx_inspections_severity ON inspections(severity);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inspections_updated_at 
    BEFORE UPDATE ON inspections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
"""


class InspectionScraperOrchestrator:
    """
    Orchestrates scraping across all counties and manages output.
    
    Attributes:
        logger: Logger instance for tracking progress
        output_dir: Directory for saving output files
        download_pdfs: Whether to download PDF reports
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
    
    def print_sql_schema(self):
        """Print the SQL schema for database setup."""
        self.logger.info("=" * 80)
        self.logger.info("SQL SCHEMA FOR POSTGRESQL/SUPABASE")
        self.logger.info("=" * 80)
        print(SQL_SCHEMA)
        self.logger.info("=" * 80)
    
    def run_all_scrapers(self) -> List[Dict[str, str]]:
        """
        Run scrapers for all counties.
        
        Returns:
            Combined list of all inspection records
        """
        all_records = []
        
        # Initialize scrapers for each county
        scrapers = [
            ('Washtenaw', WashtenawScraper(delay=3)),
            ('Wayne', WayneScraper(delay=3)),
            ('Oakland', OaklandScraper(delay=3))
        ]
        
        # Run each scraper
        for county_name, scraper in scrapers:
            self.logger.info(f"\n{'=' * 60}")
            self.logger.info(f"Starting scrape for {county_name} County")
            self.logger.info(f"{'=' * 60}")
            
            try:
                records = scraper.scrape(download_pdfs=self.download_pdfs)
                all_records.extend(records)
                self.logger.info(f"Successfully scraped {len(records)} records from {county_name}")
            except Exception as e:
                self.logger.error(f"Error scraping {county_name}: {str(e)}")
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
            self.logger.info(f"Saved {len(records)} records to {filepath}")
        except Exception as e:
            self.logger.error(f"Error saving JSON: {str(e)}")
    
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
            
            self.logger.info(f"Saved {len(records)} records to {filepath}")
        except Exception as e:
            self.logger.error(f"Error saving CSV: {str(e)}")
    
    def run(self):
        """
        Main execution method - run all scrapers and save results.
        """
        self.logger.info("=" * 80)
        self.logger.info("MULTI-COUNTY INSPECTION SCRAPER")
        self.logger.info("=" * 80)
        
        # Print SQL schema
        self.print_sql_schema()
        
        # Run scrapers
        self.logger.info("\nStarting scraping process...")
        records = self.run_all_scrapers()
        
        # Save results
        self.logger.info(f"\n{'=' * 60}")
        self.logger.info("SAVING RESULTS")
        self.logger.info(f"{'=' * 60}")
        
        if records:
            self.save_to_json(records)
            self.save_to_csv(records)
            
            # Print summary
            self.logger.info(f"\n{'=' * 60}")
            self.logger.info("SCRAPING SUMMARY")
            self.logger.info(f"{'=' * 60}")
            self.logger.info(f"Total records scraped: {len(records)}")
            
            # Count by county
            county_counts = {}
            for record in records:
                county = record.get('county', 'unknown')
                county_counts[county] = county_counts.get(county, 0) + 1
            
            for county, count in sorted(county_counts.items()):
                self.logger.info(f"  - {county.capitalize()}: {count} records")
        else:
            self.logger.warning("No records were scraped from any county")
        
        self.logger.info(f"\n{'=' * 60}")
        self.logger.info("SCRAPING COMPLETE")
        self.logger.info(f"{'=' * 60}")


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
