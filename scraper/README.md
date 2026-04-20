# Property Scraper – Maricopa & Pinal County

Scans public county assessor and treasurer records for:
- **Tax-delinquent properties** (past-due taxes listed by each county treasurer)
- **Properties assessed at ≤ $100,000** (configurable)

## Data Sources

| County | Source | URL |
|---|---|---|
| Maricopa | Assessor search | mcassessor.maricopa.gov |
| Maricopa | Treasurer delinquent list | treasurer.maricopa.gov/Parcels/Delinquent |
| Pinal | ArcGIS parcel layer (primary) | gis.pinalcountyaz.gov/arcgis/rest/… |
| Pinal | Assessor HTML search (fallback) | assessor.pinalcountyaz.gov/parcel/search |
| Pinal | Treasurer delinquent list | treasurer.pinalcountyaz.gov/Delinquent |

## Setup

```bash
cd scraper
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

```bash
# Scan both counties, default $100k ceiling
python main.py

# Custom value ceiling
python main.py --max-value 75000

# Single county
python main.py --county maricopa
python main.py --county pinal

# Only delinquent lists (fast)
python main.py --delinquent-only

# Only value-based search
python main.py --value-only

# Verbose logging
python main.py --verbose
```

## Output

Results are saved to `output/` as both **CSV** and **Excel** files, sorted by:
1. Delinquent properties first
2. Ascending assessed value

Columns: `county, apn, owner, address, city, zip, assessed_value, land_value,
improvement_value, property_class, tax_year, delinquent, amount_due, delinquent_tax_year`

A summary table is printed to the console showing top opportunities.

## Notes

- All data comes from **public records** on official county websites.
- Requests are throttled (1.5 s between calls) to avoid overloading county servers.
- Pinal County uses ArcGIS REST API — much faster than HTML scraping.
- If a county website changes its layout, update the relevant scraper file.
