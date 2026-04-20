import time
import logging
import requests
from config import HEADERS, REQUEST_DELAY, REQUEST_TIMEOUT, MAX_RETRIES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def get(url, params=None, session=None, delay=True):
    """HTTP GET with retry logic and polite delay."""
    requester = session or requests
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if delay:
                time.sleep(REQUEST_DELAY)
            resp = requester.get(
                url,
                params=params,
                headers=HEADERS,
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:
            log.warning("Attempt %d/%d failed for %s: %s", attempt, MAX_RETRIES, url, exc)
            if attempt == MAX_RETRIES:
                raise
            time.sleep(2 ** attempt)


def post(url, data=None, json=None, session=None, delay=True):
    """HTTP POST with retry logic."""
    requester = session or requests
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if delay:
                time.sleep(REQUEST_DELAY)
            resp = requester.post(
                url,
                data=data,
                json=json,
                headers=HEADERS,
                timeout=REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:
            log.warning("Attempt %d/%d failed for %s: %s", attempt, MAX_RETRIES, url, exc)
            if attempt == MAX_RETRIES:
                raise
            time.sleep(2 ** attempt)


def clean_value(raw: str) -> int | None:
    """Parse '$123,456' → 123456, returns None if unparseable."""
    if not raw:
        return None
    cleaned = raw.strip().replace("$", "").replace(",", "").replace(" ", "")
    try:
        return int(float(cleaned))
    except ValueError:
        return None
