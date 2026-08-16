"""One-off loader: parses the PSA OpenSTAT Excel export (same layout/logic
the training notebook uses - see the "Load the data" cell) and generates a
SQL file that upserts every confirmed month into palay_price_history.

Usage:
    python3 load_psa_data.py 2M4AFN01_v2.xlsx > seed_palay_price_history.sql

Then apply seed_palay_price_history.sql against whichever Postgres this is
meant for (local dev stack for testing, or the real project once ready).
"""
import sys
import pandas as pd

MONTH_MAP = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12,
}


def load(path: str) -> pd.DataFrame:
    df_raw = pd.read_excel(path, sheet_name=0, header=None)

    years = df_raw.iloc[2, 2:].ffill().tolist()
    months = df_raw.iloc[3, 2:].tolist()
    values = df_raw.iloc[4, 2:].tolist()

    records = []
    for y, m, v in zip(years, months, values):
        if v == ".." or pd.isna(v):
            continue
        records.append({"year": int(y), "month": m, "price": float(v)})

    df = pd.DataFrame(records)
    df["month_num"] = df["month"].map(MONTH_MAP)
    df["date"] = pd.to_datetime(dict(year=df.year, month=df.month_num, day=1))
    df = df[["date", "price"]].sort_values("date").reset_index(drop=True)
    return df


def to_sql(df: pd.DataFrame) -> str:
    values_sql = ",\n".join(
        f"  ('Rizal', '{row.date.date()}', {row.price}, 'manual_admin')"
        for row in df.itertuples()
    )
    return (
        "insert into public.palay_price_history (province, price_month, price_per_kg, source)\n"
        "values\n"
        f"{values_sql}\n"
        "on conflict (province, price_month) do update\n"
        "  set price_per_kg = excluded.price_per_kg,\n"
        "      source = excluded.source;\n"
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: load_psa_data.py <path-to-xlsx>", file=sys.stderr)
        sys.exit(1)
    df = load(sys.argv[1])
    print(f"-- parsed {len(df)} months, {df.date.min().date()} to {df.date.max().date()}", file=sys.stderr)
    print(to_sql(df))
