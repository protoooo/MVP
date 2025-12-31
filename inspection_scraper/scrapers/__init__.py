"""
Scrapers package for multi-county inspection reports.
UPDATED: Now includes Sword Solutions JavaScript-based scraper
"""

from .base_scraper import BaseScraper
from .sword_solutions import SwordSolutionsScraper

# Keep legacy scrapers for backward compatibility
try:
    from .washtenaw import WashtenawScraper
except ImportError:
    WashtenawScraper = None

try:
    from .wayne import WayneScraper
except ImportError:
    WayneScraper = None

try:
    from .oakland import OaklandScraper
except ImportError:
    OaklandScraper = None

__all__ = [
    'BaseScraper',
    'SwordSolutionsScraper',
]

# Add legacy scrapers if they exist
if WashtenawScraper:
    __all__.append('WashtenawScraper')
if WayneScraper:
    __all__.append('WayneScraper')
if OaklandScraper:
    __all__.append('OaklandScraper')
