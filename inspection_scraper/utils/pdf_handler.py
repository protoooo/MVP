"""
PDF handler for downloading and saving inspection report PDFs.
Downloads PDFs from inspection report links and saves them with standardized naming.
"""

import os
import re
import requests
from typing import Optional
from .logger import setup_logger


class PDFHandler:
    """
    Handles downloading and saving PDF inspection reports.
    
    Attributes:
        output_dir (str): Directory where PDFs will be saved
        logger: Logger instance for tracking downloads
    """
    
    def __init__(self, output_dir: str = 'outputs/pdfs'):
        """
        Initialize PDF handler.
        
        Args:
            output_dir: Directory to save PDFs (default: outputs/pdfs)
        """
        self.output_dir = output_dir
        self.logger = setup_logger()
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
    
    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename by removing invalid characters.
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename safe for filesystem
        """
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove leading/trailing whitespace and dots
        filename = filename.strip('. ')
        # Limit length
        if len(filename) > 200:
            filename = filename[:200]
        return filename
    
    def generate_filename(self, county: str, business_name: str, date: str) -> str:
        """
        Generate standardized filename for PDF.
        
        Args:
            county: County name
            business_name: Business name
            date: Inspection date
            
        Returns:
            Sanitized filename in format: county_businessname_date.pdf
        """
        # Clean each component
        county_clean = self.sanitize_filename(county.lower())
        business_clean = self.sanitize_filename(business_name.lower().replace(' ', '_'))
        date_clean = self.sanitize_filename(date.replace('/', '-'))
        
        # Combine into filename
        filename = f"{county_clean}_{business_clean}_{date_clean}.pdf"
        return filename
    
    def download_pdf(self, url: str, county: str, business_name: str, date: str) -> Optional[str]:
        """
        Download PDF from URL and save to disk.
        
        Args:
            url: URL of the PDF to download
            county: County name for filename
            business_name: Business name for filename
            date: Inspection date for filename
            
        Returns:
            Path to saved PDF if successful, None otherwise
        """
        if not url:
            self.logger.warning("No URL provided for PDF download")
            return None
        
        try:
            # Generate filename
            filename = self.generate_filename(county, business_name, date)
            filepath = os.path.join(self.output_dir, filename)
            
            # Check if file already exists
            if os.path.exists(filepath):
                self.logger.info(f"PDF already exists: {filename}")
                return filepath
            
            # Download PDF
            self.logger.info(f"Downloading PDF: {url}")
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Verify content type is PDF
            content_type = response.headers.get('content-type', '').lower()
            if 'pdf' not in content_type and 'application/octet-stream' not in content_type:
                self.logger.warning(f"URL may not be a PDF (content-type: {content_type}): {url}")
            
            # Save to file
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            self.logger.info(f"PDF saved: {filename}")
            return filepath
            
        except requests.RequestException as e:
            self.logger.error(f"Error downloading PDF from {url}: {str(e)}")
            return None
        except Exception as e:
            self.logger.error(f"Error saving PDF: {str(e)}")
            return None
    
    def download_pdfs_batch(self, records: list) -> int:
        """
        Download PDFs for a batch of inspection records.
        
        Args:
            records: List of inspection record dictionaries
            
        Returns:
            Number of PDFs successfully downloaded
        """
        success_count = 0
        
        for record in records:
            url = record.get('report_link', '')
            county = record.get('county', 'unknown')
            business_name = record.get('business_name', 'unknown')
            date = record.get('inspection_date', 'unknown')
            
            if url:
                result = self.download_pdf(url, county, business_name, date)
                if result:
                    success_count += 1
        
        self.logger.info(f"Downloaded {success_count} PDFs out of {len(records)} records")
        return success_count
