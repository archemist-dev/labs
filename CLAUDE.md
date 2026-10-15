# Archemist labs

Runnable tests behind Archemist articles and videos (archemist.dev). Every published number comes from a script here. Editorial rules live in the studio vault (`archemist-dev/studio`, `CLAUDE.md`).

## Layout

- One folder per topic, numbered by week: `01-payload-encoding/`.
- Each folder: the test script, pinned `requirements.txt`, input data as JSON files (`order_typical.json`, `order_big.json`, ...), `scale.py` for cost math, `diagrams.py` for the article PNGs, a README with the results and the server they came from, and the raw reference log `results-<instance>-<date>.txt`.
- `run-on-vm.sh <folder>`: runs a lab on a fresh Ubuntu VM, twice per input, and prints the CPU.
- `.github/workflows/`: GitHub Actions re-runs each lab on push and on demand (the free "re-run it yourself" backup).

## Rules

- Reference numbers come from an AWS EC2 t3.micro (x86) in Javlon's personal account, launched per test and terminated after. Name the instance, region and CPU in every README. Actions and laptop numbers are never the published reference. Exception: a lab with no timings (deterministic counts, e.g. `02-extract-first/`) needs no VM; two identical runs anywhere are the reference, and Actions checks they match.
- Run every test twice; publish only when the runs agree (within about 5%).
- Sizes, costs and ratios go into the article; microseconds come with the server they were measured on.
- Inputs are realistic: a typical case first (e.g. a 3-item order), the big case as a side note, an untrimmed version when the topic compares levels.
- Example data: Anglia Ruskin University, East Rd, Cambridge CB1 1PT (lat 52.203889, lon 0.132917), GBP prices as integer pence, statuses ending in DELIVERED. Never Tashkent, UZS or Central Asian details. Synthetic people only (guest_1, courier_7).
- Diagram style: charcoal `#1b1d21`, off-white `#f2efe9`, Inter labels, JetBrains Mono numbers, big type; green = win, gray = neutral, red = bad (solid red = silent failure); brand gold `#d4a017` only as the line under the title.
- No secrets, no real data. Never commit to `main`; one branch and PR per change.
