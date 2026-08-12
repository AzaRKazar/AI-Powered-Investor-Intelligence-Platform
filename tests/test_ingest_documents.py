from pathlib import Path

import pytest

from ingestion.ingest_documents import parse_company_year


@pytest.mark.parametrize(
    "filename, expected_company, expected_year",
    [
        ("2024_Apple.pdf", "Apple", "2024"),
        ("2024_AnnualReport_Apple.pdf", "Apple", "2024"),
        ("TSLA_2025.pdf", "TSLA", "2025"),
        ("MSFT_2025.pdf", "MSFT", "2025"),
        ("Apple.pdf", "Apple", ""),
    ],
)
def test_parse_company_year(filename, expected_company, expected_year):
    company, year = parse_company_year(Path(filename))

    assert company == expected_company
    assert year == expected_year
