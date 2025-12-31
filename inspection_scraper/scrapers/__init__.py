"""
Scrapers package for multi-county inspection reports.
Contains base scraper class and county-specific implementations.
"""

from .base_scraper import BaseScraper
from .washtenaw import WashtenawScraper
from .wayne import WayneScraper
from .oakland import OaklandScraper

__all__ = ['BaseScraper', 'WashtenawScraper', 'WayneScraper', 'OaklandScraper']
