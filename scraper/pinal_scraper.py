"""
Pinal County property scraper.

Data sources:
  Assessor search  – https://assessor.pinalcountyaz.gov/parcel/search
  Treasurer lien   – https://treasurer.pinalcountyaz.gov/Delinquent
  GIS / parcel API – https://gis.pinalcountyaz.gov (ArcGIS REST)

Pinal County uses an ArcGIS-based parcel service which we can query
directly for value-filtered results — much cleaner than HTML scraping.
"""

import re
import json
import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any

from config import (
    PINAL_ASSESSOR_BASE,
    PINAL_ASSESSOR_SEARCH,
    PINAL_TREASURER_BASE,
    PINAL_DELINQUENT_URL,
    MAX_VALUE,
)
from utils import get, post, clean_value, log


# ArcGIS REST endpoint for Pinal County parcels (public GIS server)
PINAL_GIS_PARCELS = (
    "https://gis.pinalcountyaz.gov/arcgis/rest/services/Parcels/ParcelSearch/MapServer/0/query"
)


# ── GIS / ArcGIS query ───────────────────────────────────────────────────────

def search_gis_by_value(max_value: int = MAX_VALUE) -> List[Dict[str, Any]]:
    """
    Query Pinal County ArcGIS parcel layer for assessed value ≤ max_value.
    The ArcGIS REST API supports WHERE clauses, so we can filter server-side.
    """
    log.info("Pinal County GIS: querying parcels with assessed value ≤ $%s", f"{max_value:,}")
    results = []
    offset = 0
    batch = 1000  # ArcGIS default max records per request

    while True:
        params = {
            "where": f"ASSESSED_VALUE <= {max_value} AND ASSESSED_VALUE > 0",
            "outFields": (
                "APN,OWNER_NAME,SITUS_ADDRESS,SITUS_CITY,SITUS_ZIP,"
                "ASSESSED_VALUE,LAND_VALUE,IMPROVEMENT_VALUE,"
                "PROPERTY_CLASS,TAX_YEAR"
            ),
            "returnGeometry": "false",
            "resultOffset": offset,
            "resultRecordCount": batch,
            "f": "json",
        }

        try:
            resp = get(PINAL_GIS_PARCELS, params=params)
            data = resp.json()
        except Exception as exc:
            log.error("Pinal GIS query failed at offset %d: %s", offset, exc)
            break

        features = data.get("features", [])
        if not features:
            break

        for feat in features:
            attrs = feat.get("attributes", {})
            results.append({
                "county": "Pinal",
                "apn": attrs.get("APN", ""),
                "owner": attrs.get("OWNER_NAME", ""),
                "address": attrs.get("SITUS_ADDRESS", ""),
                "city": attrs.get("SITUS_CITY", ""),
                "zip": str(attrs.get("SITUS_ZIP", "")),
                "assessed_value": attrs.get("ASSESSED_VALUE"),
                "land_value": attrs.get("LAND_VALUE"),
                "improvement_value": attrs.get("IMPROVEMENT_VALUE"),
                "property_class": attrs.get("PROPERTY_CLASS", ""),
                "tax_year": attrs.get("TAX_YEAR", ""),
                "delinquent": False,
            })

        log.info("  offset %d → +%d records (total %d)", offset, len(features), len(results))

        # ArcGIS signals "more records exist" via exceededTransferLimit
        if data.get("exceededTransferLimit"):
            offset += batch
        else:
            break

    log.info("Pinal GIS: %d total parcels found", len(results))
    return results


# ── Assessor HTML search (fallback) ──────────────────────────────────────────

def search_assessor_html(max_value: int = MAX_VALUE) -> List[Dict[str, Any]]:
    """
    Fallback: scrape the Pinal County Assessor search HTML interface.
    Used when the GIS endpoint is unavailable.
    """
    log.info("Pinal Assessor HTML: searching for properties ≤ $%s", f"{max_value:,}")
    results = []
    session = requests.Session()
    page = 1

    while True:
        params = {
            "SearchType": "Value",
            "MaxValue": max_value,
            "MinValue": 0,
            "Page": page,
        }
        try:
            resp = get(PINAL_ASSESSOR_SEARCH, params=params, session=session)
        except Exception as exc:
            log.error("Pinal Assessor HTML search failed: %s", exc)
            break

        soup = BeautifulSoup(resp.text, "lxml")
        rows = _parse_pinal_table(soup)
        if not rows:
            break

        results.extend(rows)
        log.info("  page %d → %d records", page, len(rows))

        next_btn = soup.find("a", string=re.compile(r"next", re.I))
        if not next_btn:
            break
        page += 1

    log.info("Pinal Assessor HTML: %d total parcels", len(results))
    return results


def _parse_pinal_table(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    """Parse a Pinal County Assessor HTML result table."""
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
        records.append({
            "county": "Pinal",
            "apn": row.get("apn") or row.get("parcel number", ""),
            "owner": row.get("owner") or row.get("owner name", ""),
            "address": row.get("address") or row.get("situs address", ""),
            "city": row.get("city", ""),
            "zip": row.get("zip", ""),
            "assessed_value": clean_value(
                row.get("assessed value") or row.get("lpv") or row.get("value", "")
            ),
            "land_value": clean_value(row.get("land value", "")),
            "improvement_value": clean_value(row.get("improvement value", "")),
            "property_class": row.get("property class") or row.get("class", ""),
            "tax_year": row.get("tax year", ""),
            "delinquent": False,
        })
    return records


# ── Treasurer delinquent list ─────────────────────────────────────────────────

def fetch_delinquent_list() -> List[Dict[str, Any]]:
    """
    Fetch Pinal County Treasurer delinquent parcel list.
    Pinal posts an annual list; we parse the HTML table or CSV export.
    """
    log.info("Pinal Treasurer: fetching delinquent list …")
    delinquent = []

    try:
        resp = get(PINAL_DELINQUENT_URL)
    except Exception as exc:
        log.error("Could not fetch Pinal delinquent list: %s", exc)
        return delinquent

    soup = BeautifulSoup(resp.text, "lxml")

    # Look for downloadable file link
    csv_link = soup.find("a", href=re.compile(r"\.(csv|xlsx?)$", re.I))
    if csv_link:
        href = csv_link["href"]
        if not href.startswith("http"):
            href = PINAL_TREASURER_BASE + href
        log.info("  Found export link: %s", href)
        return _download_file(href)

    table = soup.find("table")
    if not table:
        log.warning("Pinal delinquent: no table found on page")
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

    log.info("Pinal Treasurer: %d delinquent parcels", len(delinquent))
    return delinquent


def _download_file(url: str) -> List[Dict[str, Any]]:
    import io
    import pandas as pd
    try:
        resp = get(url, delay=False)
        if url.lower().endswith(".csv"):
            df = pd.read_csv(io.StringIO(resp.text))
        else:
            df = pd.read_excel(io.BytesIO(resp.content))
        df.columns = [c.strip().lower() for c in df.columns]
        records = df.to_dict("records")
        log.info("Downloaded %d rows from %s", len(records), url)
        return records
    except Exception as exc:
        log.error("File download failed: %s", exc)
        return []
