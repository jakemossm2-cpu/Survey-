#!/usr/bin/env python3
"""
Property Scraper – Maricopa & Pinal County, Arizona
====================================================
Finds:
  1. Tax-delinquent properties (county treasurer records)
  2. Properties with assessed value ≤ $100,000 (configurable)

Usage:
  python main.py                     # run everything, default $100k ceiling
  python main.py --max-value 75000   # custom value ceiling
  python main.py --county maricopa   # single county
  python main.py --county pinal
  python main.py --delinquent-only   # skip value search, only delinquent list
  python main.py --value-only        # skip delinquent, only value search
"""

import os
import argparse
import logging
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any

from config import MAX_VALUE, OUTPUT_DIR
from utils import log
import maricopa_scraper
import pinal_scraper


def merge_delinquent_flag(
    properties: List[Dict[str, Any]],
    delinquent: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Mark properties as delinquent by cross-referencing APN.
    Also appends delinquent properties not already in the value-search results.
    """
    delinquent_apns = {}
    for d in delinquent:
        apn = str(d.get("apn", "")).strip()
        if apn:
            delinquent_apns[apn] = d

    # Flag existing matches
    matched_apns = set()
    for prop in properties:
        apn = str(prop.get("apn", "")).strip()
        if apn in delinquent_apns:
            prop["delinquent"] = True
            prop["amount_due"] = delinquent_apns[apn].get("amount_due", "")
            prop["delinquent_tax_year"] = delinquent_apns[apn].get("tax_year", "")
            matched_apns.add(apn)

    # Append delinquent-only records not already in results
    for apn, d in delinquent_apns.items():
        if apn not in matched_apns:
            properties.append({
                "county": d.get("county", "Unknown"),
                "apn": apn,
                "owner": d.get("owner", ""),
                "address": "",
                "city": "",
                "zip": "",
                "assessed_value": None,
                "land_value": None,
                "improvement_value": None,
                "property_class": "",
                "tax_year": d.get("tax_year", ""),
                "delinquent": True,
                "amount_due": d.get("amount_due", ""),
                "delinquent_tax_year": d.get("tax_year", ""),
            })

    return properties


def run_maricopa(max_value: int, delinquent_only: bool, value_only: bool) -> List[Dict[str, Any]]:
    log.info("═══ MARICOPA COUNTY ═══")
    properties: List[Dict[str, Any]] = []

    if not delinquent_only:
        try:
            properties = maricopa_scraper.search_assessor_by_value(max_value)
        except Exception as exc:
            log.error("Maricopa assessor search failed: %s", exc)

    if not value_only:
        try:
            delinquent = maricopa_scraper.fetch_delinquent_list()
            properties = merge_delinquent_flag(properties, delinquent)
        except Exception as exc:
            log.error("Maricopa delinquent fetch failed: %s", exc)

    log.info("Maricopa total records: %d", len(properties))
    return properties


def run_pinal(max_value: int, delinquent_only: bool, value_only: bool) -> List[Dict[str, Any]]:
    log.info("═══ PINAL COUNTY ═══")
    properties: List[Dict[str, Any]] = []

    if not delinquent_only:
        try:
            # Try ArcGIS first, fall back to HTML scraper
            properties = pinal_scraper.search_gis_by_value(max_value)
            if not properties:
                log.info("GIS returned no results – trying HTML fallback")
                properties = pinal_scraper.search_assessor_html(max_value)
        except Exception as exc:
            log.error("Pinal assessor search failed: %s", exc)
            try:
                properties = pinal_scraper.search_assessor_html(max_value)
            except Exception as exc2:
                log.error("Pinal HTML fallback also failed: %s", exc2)

    if not value_only:
        try:
            delinquent = pinal_scraper.fetch_delinquent_list()
            properties = merge_delinquent_flag(properties, delinquent)
        except Exception as exc:
            log.error("Pinal delinquent fetch failed: %s", exc)

    log.info("Pinal total records: %d", len(properties))
    return properties


def save_results(all_properties: List[Dict[str, Any]], max_value: int) -> str:
    """Save results to CSV and Excel in the output directory."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base = os.path.join(OUTPUT_DIR, f"properties_{timestamp}")

    df = pd.DataFrame(all_properties)

    # Ensure consistent column order
    cols = [
        "county", "apn", "owner", "address", "city", "zip",
        "assessed_value", "land_value", "improvement_value",
        "property_class", "tax_year",
        "delinquent", "amount_due", "delinquent_tax_year",
    ]
    for c in cols:
        if c not in df.columns:
            df[c] = ""
    df = df[cols]

    # Sort: delinquent first, then by ascending value
    df["_sort_delinquent"] = df["delinquent"].apply(lambda x: 0 if x else 1)
    df["_sort_value"] = pd.to_numeric(df["assessed_value"], errors="coerce").fillna(999_999_999)
    df = df.sort_values(["_sort_delinquent", "_sort_value"]).drop(
        columns=["_sort_delinquent", "_sort_value"]
    )

    csv_path = base + ".csv"
    xlsx_path = base + ".xlsx"
    df.to_csv(csv_path, index=False)
    df.to_excel(xlsx_path, index=False)

    print_summary(df, max_value)
    log.info("Results saved:\n  CSV  → %s\n  XLSX → %s", csv_path, xlsx_path)
    return csv_path


def print_summary(df: pd.DataFrame, max_value: int):
    """Print a human-readable summary to stdout."""
    total = len(df)
    delinquent_count = df["delinquent"].sum()
    under_value = df[pd.to_numeric(df["assessed_value"], errors="coerce") <= max_value]
    both = df[
        (df["delinquent"] == True)
        & (pd.to_numeric(df["assessed_value"], errors="coerce") <= max_value)
    ]

    print("\n" + "=" * 60)
    print("  PROPERTY SCAN RESULTS")
    print("=" * 60)
    print(f"  Total properties found  : {total:,}")
    print(f"  Tax-delinquent          : {int(delinquent_count):,}")
    print(f"  Assessed ≤ ${max_value:,}     : {len(under_value):,}")
    print(f"  Delinquent + under value: {len(both):,}")
    print()

    if "county" in df.columns:
        print("  By county:")
        for county, grp in df.groupby("county"):
            d = grp["delinquent"].sum()
            print(f"    {county:12s} → {len(grp):,} total, {int(d):,} delinquent")
    print("=" * 60 + "\n")

    # Show top 20 best opportunities (delinquent + lowest value)
    best = df[df["delinquent"] == True].copy()
    best["assessed_value"] = pd.to_numeric(best["assessed_value"], errors="coerce")
    best = best.sort_values("assessed_value").head(20)

    if not best.empty:
        print("  TOP OPPORTUNITIES (delinquent, sorted by value):")
        print(f"  {'APN':<15} {'County':<10} {'Value':>10} {'Address':<35} {'Owner':<25}")
        print("  " + "-" * 95)
        for _, row in best.iterrows():
            val = f"${int(row['assessed_value']):,}" if pd.notna(row["assessed_value"]) else "N/A"
            addr = str(row.get("address", ""))[:34]
            owner = str(row.get("owner", ""))[:24]
            print(f"  {str(row['apn']):<15} {str(row['county']):<10} {val:>10} {addr:<35} {owner:<25}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Maricopa & Pinal County for under-value / delinquent properties"
    )
    parser.add_argument(
        "--max-value", type=int, default=MAX_VALUE,
        help=f"Maximum assessed value filter (default: ${MAX_VALUE:,})"
    )
    parser.add_argument(
        "--county", choices=["maricopa", "pinal", "both"], default="both",
        help="Which county to scrape (default: both)"
    )
    parser.add_argument(
        "--delinquent-only", action="store_true",
        help="Only fetch delinquent lists, skip value-based assessor search"
    )
    parser.add_argument(
        "--value-only", action="store_true",
        help="Only search by value, skip delinquent lists"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Enable DEBUG logging"
    )
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    log.info(
        "Starting property scan | max_value=$%s | county=%s",
        f"{args.max_value:,}", args.county
    )

    all_properties: List[Dict[str, Any]] = []

    if args.county in ("maricopa", "both"):
        all_properties += run_maricopa(args.max_value, args.delinquent_only, args.value_only)

    if args.county in ("pinal", "both"):
        all_properties += run_pinal(args.max_value, args.delinquent_only, args.value_only)

    if all_properties:
        save_results(all_properties, args.max_value)
    else:
        log.warning("No properties returned. Check network access and county website availability.")


if __name__ == "__main__":
    main()
