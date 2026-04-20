"""
Configuration for Maricopa & Pinal County property scraper.
Targets:
  - Maricopa County Assessor  (mcassessor.maricopa.gov)
  - Maricopa County Treasurer tax-lien list (treasurer.maricopa.gov)
  - Pinal County Assessor     (assessor.pinalcountyaz.gov)
  - Pinal County Treasurer    (treasurer.pinalcountyaz.gov)
"""

MAX_VALUE = 100_000          # dollar ceiling for "under 100k" filter
REQUEST_DELAY = 1.5          # seconds between HTTP requests (be polite)
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Maricopa County
MARICOPA_ASSESSOR_BASE = "https://mcassessor.maricopa.gov"
MARICOPA_ASSESSOR_SEARCH = "https://mcassessor.maricopa.gov/mcs.php"
MARICOPA_TREASURER_BASE = "https://treasurer.maricopa.gov"
MARICOPA_DELINQUENT_URL = "https://treasurer.maricopa.gov/Parcels/Delinquent"

# Pinal County
PINAL_ASSESSOR_BASE = "https://assessor.pinalcountyaz.gov"
PINAL_ASSESSOR_SEARCH = "https://assessor.pinalcountyaz.gov/parcel/search"
PINAL_TREASURER_BASE = "https://treasurer.pinalcountyaz.gov"
PINAL_DELINQUENT_URL = "https://treasurer.pinalcountyaz.gov/Delinquent"

OUTPUT_DIR = "output"
