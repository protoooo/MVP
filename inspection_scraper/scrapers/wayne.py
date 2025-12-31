"""
Wayne County specific scraper implementation.
Loads configuration and uses BaseScraper for scraping logic.
"""

import json
import os
from .base_scraper import BaseScraper


class WayneScraper(BaseScraper):
    """
    Scraper for Wayne County inspection reports.
    Inherits from BaseScraper and loads county-specific configuration.
    """
    
    def __init__(self, delay: int = 3):
        """
        Initialize Wayne County scraper.
        
        Args:
            delay: Seconds to wait between requests (default: 3)
        """
        # Load configuration from counties.json
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'config',
            'counties.json'
        )
        
        with open(config_path, 'r') as f:
            configs = json.load(f)
        
        config = configs.get('wayne', {})
        super().__init__('wayne', config, delay)
