"""
Maricopa County property scraper.

Data sources:
  Assessor search  – https://mcassessor.maricopa.gov/mcs.php
  Delinquent list  – https://treasurer.maricopa.gov/Parcels/Delinquent
  GIS parcel API   – https://mcassessor.maricopa.gov/mcs.php?q=<apn>

The Maricopa assessor exposes a JSON-friendly search endpoint when the
Accept header requests JSON or when queried via their internal API path.
We use both the HTML search and the documented JSON endpoint.
"""

import re
import json
import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any

from config import (
    MARICOPA_ASSESSOR_SEARCH,
    MARICOPA_TREASURER_BASE,
    MARICOPA_DELINQUENT_URL,
    MAX_VALUE,
)
from utils import get, post, clean_value, log


# ── Assessor search ──────────────────────────────────────────────────────────

def search_assessor_by_value(max_value: int = MAX_VALUE) -> List[Dict[str, Any]]:
    """
    Maricopa County Assessor advanced search.
    We iterate over value ranges (0–50k, 50k–100k) and collect parcels.
    Returns a list of property dicts.
    """
    results = []
    ranges = [(0, 50_000), (50_001, max_value)]

    session = requests.Session()

    for lo, hi in ranges:
        log.info("Maricopa Assessor: searching LPV $%s–$%s", f"{lo:,}", f"{hi:,}")
        page = 1
        while True:
            params = {
                "q": "",
                "t": "address",
                "lpv_min": lo,
                "lpv_max": hi,
                "pg": page,
            }
            try:
                resp = get(MARICOPA_ASSESSOR_SEARCH, params=params, session=session)
            except Exception as exc:
                log.error("Assessor search failed: %s", exc)
                break

            soup = BeautifulSoup(resp.text, "lxml")
            rows = _parse_assessor_table(soup)
            if not rows:
                break

            results.extend(rows)
            log.info("  page %d → %d records", page, len(rows))

            # Check for next page link
            next_btn = soup.find("a", string=re.compile(r"next", re.I))
            if not next_btn:
                break
            page += 1

    log.info("Maricopa Assessor: %d total parcels found", len(results))
    return results


def _parse_assessor_table(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    """Extract property rows from the assessor search results table."""
    records = []
    table = soup.find("table", {"id": re.compile(r"result|parcel|search", re.I)})
    if not table:
        table = soup.find("table")
    if not table:
        return records

    headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]

    for tr in table.find_all("tr")[1:]:
        cells = [td.get_text(strip=True) for td in tr.find_all("td")]
        if not cells:
            continue
        row = dict(zip(headers, cells))

        # Normalise keys to a common schema
        record = {
            "county": "Maricopa",
            "apn": row.get("apn") or row.get("parcel") or row.get("parcel number", ""),
            "owner": row.get("owner") or row.get("owner name", ""),
            "address": row.get("address") or row.get("situs address", ""),
            "city": row.get("city", ""),
            "zip": row.get("zip", ""),
            "assessed_value": clean_value(
                row.get("lpv") or row.get("assessed value") or row.get("value", "")
            ),
            "land_value": clean_value(row.get("land value", "")),
            "improvement_value": clean_value(row.get("improvement value", "")),
            "property_class": row.get("property class") or row.get("class", ""),
            "tax_year": row.get("tax year", ""),
            "delinquent": False,
        }
        records.append(record)

    return records


# ── Treasurer delinquent list ─────────────────────────────────────────────────

def fetch_delinquent_list() -> List[Dict[str, Any]]:
    """
    Fetch the Maricopa County Treasurer's delinquent parcel list.
    The treasurer posts an HTML table at /Parcels/Delinquent.
    Returns list of {apn, owner, amount_due, tax_year} dicts.
    """
    log.info("Maricopa Treasurer: fetching delinquent list …")
    delinquent = []

    try:
        resp = get(MARICOPA_DELINQUENT_URL)
    except Exception as exc:
        log.error("Could not fetch Maricopa delinquent list: %s", exc)
        return delinquent

    soup = BeautifulSoup(resp.text, "lxml")

    # Look for a download link (CSV / Excel) first
    csv_link = soup.find("a", href=re.compile(r"\.(csv|xlsx?)$", re.I))
    if csv_link:
        href = csv_link["href"]
        if not href.startswith("http"):
            href = MARICOPA_TREASURER_BASE + href
        log.info("  Found CSV export link: %s", href)
        return _download_csv_delinquent(href, "Maricopa")

    # Fall back to HTML table
    table = soup.find("table")
    if not table:
        log.warning("Maricopa delinquent: no table found on page")
        return delinquent

    headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
    for tr in table.find_all("tr")[1:]:
        cells = [td.get_text(strip=True) for td in tr.find_all("td")]
        if not cells:
            continue
        row = dict(zip(headers, cells))
        delinquent.append({
            "apn": row.get("apn") or row.get("parcel number", ""),
            "owner": row.get("owner") or row.get("owner name", ""),
            "amount_due": clean_value(row.get("amount due") or row.get("total due", "")),
            "tax_year": row.get("year") or row.get("tax year", ""),
        })

    log.info("Maricopa Treasurer: %d delinquent parcels", len(delinquent))
    return delinquent


def _download_csv_delinquent(url: str, county: str) -> List[Dict[str, Any]]:
    """Download and parse a CSV/Excel delinquent list."""
    import io
    import pandas as pd

    try:
        resp = get(url, delay=False)
        if url.endswith(".csv"):
            df = pd.read_csv(io.StringIO(resp.text))
        else:
            df = pd.read_excel(io.BytesIO(resp.content))
        df.columns = [c.strip().lower() for c in df.columns]
        records = df.to_dict("records")
        log.info("%s delinquent CSV: %d rows", county, len(records))
        return records
    except Exception as exc:
        log.error("CSV download failed: %s", exc)
        return []


# ── Parcel detail lookup ──────────────────────────────────────────────────────

def get_parcel_detail(apn: str, session: requests.Session = None) -> Dict[str, Any]:
    """
    Fetch individual parcel detail from Maricopa Assessor.
    Returns a dict with full property info, or empty dict on failure.
    """
    url = f"https://mcassessor.maricopa.gov/mcs.php?q={apn}"
    try:
        resp = get(url, session=session)
    except Exception as exc:
        log.debug("Parcel detail fetch failed for %s: %s", apn, exc)
        return {}

    soup = BeautifulSoup(resp.text, "lxml")

    # Try to extract JSON blob embedded in the page
    script_tags = soup.find_all("script")
    for script in script_tags:
        text = script.string or ""
        match = re.search(r"parcelData\s*=\s*(\{.*?\});", text, re.S)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

    # Fall back to scraping the detail table
    detail = {}
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True).lower().replace(" ", "_")
            val = cells[1].get_text(strip=True)
            detail[key] = val

    return detail
