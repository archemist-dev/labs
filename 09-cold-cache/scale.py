"""Day model: how many menu reads wait for a rebuild when edits go from monthly to daily.

Usage: python3 scale.py [summary.json]
Reads the median requests per edit that paid for a rebuild (waited for one, or failed) and multiplies by the edit rate.
Assumptions (printed with the result): one menu key, the lab's read rate held during the edit, every edit clears
the whole menu, and a month of 30 days. Real traffic is uneven, so an edit at lunch hits more readers than this.
"""
import json
import sys

EDITS_PER_MONTH = {"1 edit a month": 1, "1 edit a day": 30, "2 edits a day": 60}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "summary.json"
    with open(path) as f:
        data = json.load(f)
    rps = data["settings"]["rps"]
    print(f"Assumptions: {rps} menu reads/s during every edit, one menu key, each edit clears the whole menu, "
          f"30-day month.\n")
    print(f"{'strategy':<14}{'paid/edit':>12}{'rebuilds/edit':>14}" + "".join(f"{k:>18}" for k in EDITS_PER_MONTH))
    for s in data["strategies"]:
        paid, rebuilds = s["paid"]["median"], s["rebuilds"]["median"]
        row = f"{s['strategy']:<14}{paid:>12g}{rebuilds:>14g}"
        row += "".join(f"{round(paid * n):>18,}" for n in EDITS_PER_MONTH.values())
        print(row)
    print("\nColumns per edit rate: menu reads per month that waited for a rebuild or failed.")


if __name__ == "__main__":
    main()
