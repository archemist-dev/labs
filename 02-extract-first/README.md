# 02 - Which service do you extract first?

A small food-delivery monolith (menu, orders, payments, couriers, notifications; one shared database) with the shortcuts most monoliths grow: orders reads the menu's tables, payments and notifications read and write the orders tables. Notifications go through an in-process event queue, so a failed message never fails an order. One typical order runs end to end (3 items, payment, kitchen, courier, 25-minute delivery, DELIVERED) while the test records every SQL statement and every call between modules.

```bash
python3 extract_test.py          # copy (default): couriers copies the delivery point at assignment
python3 extract_test.py calls    # couriers asks orders on every ETA refresh
python3 extract_test.py joins    # couriers reads the orders table on every ETA refresh
python3 scale.py                 # per-order rows scaled to a day and a year
python3 diagrams.py OUT_DIR      # article PNGs (needs Google Chrome)
```

Standard library only (Python 3.12+). Simulated clock, in-memory SQLite, no timings: the output is deterministic, so the machine doesn't matter and two runs must match exactly. GitHub Actions re-runs every variant and fails if two runs differ (Actions → extract-first → Run workflow). Data is synthetic: guest_1, courier_7, delivery to Anglia Ruskin University, Cambridge, prices in pence.

The monolith in [monolith/](monolith/) was written for this test. Change a shortcut (for example, make payments call orders instead of writing its table) and re-run to see the numbers move.

## What is measured

- **Writes / reads of its tables:** load on the data the module owns, per order. A module with its own heavy load has its own reason to scale.
- **Others' tables it touches / its tables others touch:** statements that cross the ownership line. Each one becomes an API call or a data contract after extraction.
- **Calls out / calls in:** function calls and events between modules. Each becomes a network call or a message.
- **Seams to cut:** distinct cross-module table links plus distinct cross-module functions or events. The work to get the module out.
- **On order creation:** the module's code or tables are used while the order is created. A bug there blocks orders.

## Results (2026-10-15)

Every variant twice, identical output ([results-mac-2026-10-15.txt](results-mac-2026-10-15.txt)). Assumptions: GPS point every 10 s, ETA refresh every 30 s, 10 minutes to the restaurant, 15 to the guest.

Default (`copy`, the courier module keeps its own copy of the delivery point):

| Module | Owns tables | Writes to its tables | Reads of its tables | Others' tables it touches | Its tables others touch | Calls out | Calls in | Seams to cut | On order creation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| menu | 2 | 0 | 5 | 0 (0 tables) | 5 (2 links) | 0 | 0 | 2 | yes |
| orders | 3 | 16 | 7 | 5 (2 tables) | 8 (3 links) | 6 | 4 | 10 | yes |
| payments | 1 | 1 | 0 | 3 (2 tables) | 0 (0 links) | 0 | 1 | 3 | yes |
| couriers | 4 | 151 | 102 | 0 (0 tables) | 0 (0 links) | 4 | 0 | 3 | no |
| notifications | 1 | 5 | 0 | 5 (1 table) | 0 (0 links) | 0 | 5 | 2 | no |

Per table: `courier_positions` takes 150 of the order's 173 writes (87%); the other courier tables take 1.

How couriers gets the delivery point changes the traffic, not the pick:

| Variant | Couriers: seams | Couriers → orders per order | On order creation |
| --- | --- | --- | --- |
| copy | 3 | 4 calls | no |
| calls | 3 | 53 calls | no |
| joins | 3 | 3 calls + 50 reads of the orders table | no |

## At scale (`python3 scale.py`)

One order writes 150 position rows and 10 rows to the orders tables (orders, order_items, order_status_history).

| Orders/day | Position rows/day | Writes/s avg | Writes/s peak | Position rows/yr | GB/yr | Order rows/yr |
| --- | --- | --- | --- | --- | --- | --- |
| 1,000 | 150,000 | 1.7 | 6 | 55M | 5.5 | 3.6M |
| 10,000 | 1,500,000 | 17.4 | 62 | 548M | 54.8 | 36.5M |

Assumptions: peak hour = 15% of the day's orders, a courier holds an order 25 minutes, one GPS point every 10 s, about 100 bytes per position row with its index, positions kept for a year. The write rate is easy for one Postgres; the size is the problem: position rows grow 15x faster than order rows, and they slow backups, vacuum and every query on the shared database.

## Reading it

- **orders** is the most important module and the worst first pick: 10 seams and on the order-creation path.
- **menu** and **payments** have few seams but sit on the order-creation path: prices are read and the charge is made while the order is created. A bug or an outage there blocks orders.
- **notifications** has few seams and is off the path: it's an event, so a failed message can't fail an order. It passes two of three questions, but it has no load of its own (5 writes per order): a fine second pick.
- **couriers** has few seams, touches no other module's tables, is off the order-creation path and carries 87% of the writes: its own reason to move. The hot table (`courier_positions`) can go to its own database from day one.
- Copy the order data couriers needs when the courier is assigned. Asking orders on every ETA refresh costs 50 extra calls per order, and reading its table directly ties the two databases together.
