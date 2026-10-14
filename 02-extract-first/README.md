# 02 - Which service do you extract first?

A small food-delivery monolith (menu, orders, payments, couriers, notifications; one shared database) with the shortcuts most monoliths grow: orders reads the menu's tables, payments and notifications read and write the orders tables. One typical order runs end to end (3 items, payment, kitchen, courier, 25-minute delivery, DELIVERED) while the test records every SQL statement and every call between modules.

```bash
python3 extract_test.py
```

Standard library only (Python 3.12+). Simulated clock, in-memory SQLite, no timings: the output is deterministic, so the machine doesn't matter and two runs must match exactly. GitHub Actions re-runs it and fails if they don't (Actions → extract-first → Run workflow). Data is synthetic: guest_1, courier_7, delivery to Anglia Ruskin University, Cambridge, prices in pence.

The monolith in [monolith/](monolith/) was written for this test. Change a shortcut (for example, make payments call orders instead of writing its table) and re-run to see the numbers move.

## What is measured

- **Writes / reads of its tables:** load on the data the module owns, per order. A module with its own heavy load has its own reason to scale.
- **Others' tables it touches / its tables others touch:** statements that cross the ownership line. Each one becomes an API call or a data contract after extraction.
- **Calls out / calls in:** function calls between modules. Each becomes a network call.
- **Seams to cut:** distinct cross-module table links plus distinct cross-module functions. The work to get the module out.
- **On order creation:** the module's code or tables are used while the order is created. A bug there blocks orders.

## Results (2026-10-14)

Two runs, identical output ([results-mac-2026-10-14.txt](results-mac-2026-10-14.txt)). Assumptions: GPS point every 10 s, ETA refresh every 30 s, 10 minutes to the restaurant, 15 to the guest.

| Module | Owns tables | Writes to its tables | Reads of its tables | Others' tables it touches | Its tables others touch | Calls out | Calls in | Seams to cut | On order creation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| menu | 2 | 0 | 5 | 0 (0 tables) | 5 (2 links) | 0 | 0 | 2 | yes |
| orders | 3 | 16 | 56 | 5 (2 tables) | 8 (3 links) | 6 | 53 | 10 | yes |
| payments | 1 | 1 | 0 | 3 (2 tables) | 0 (0 links) | 0 | 1 | 3 | yes |
| couriers | 3 | 150 | 52 | 0 (0 tables) | 0 (0 links) | 53 | 0 | 3 | no |
| notifications | 1 | 5 | 0 | 5 (1 table) | 0 (0 links) | 0 | 5 | 2 | yes |

Per table: `courier_positions` takes 150 of the order's 172 writes (87%); `orders` is read 56 times, by three modules.

Calls across modules:

| From | To | Function | Calls |
| --- | --- | --- | --- |
| couriers | orders | assign_courier | 1 |
| couriers | orders | delivery_point | 50 |
| couriers | orders | set_status | 2 |
| orders | notifications | send | 5 |
| orders | payments | charge | 1 |

## Reading it

- **orders** is the most important module and the worst first pick: 10 seams, 53 calls in, and on the order-creation path.
- **menu**, **payments** and **notifications** have few seams, but all three sit on the order-creation path: a bug or an outage there blocks orders. Notifications is the textbook "boring edge" pick, yet here it's called synchronously inside order creation; it becomes a safe first pick only once that call is an event.
- **couriers** has few seams, touches no other module's tables, is off the order-creation path and carries 87% of the writes: its own reason to scale. The hot table (`courier_positions`) can go to its own database from day one.
- The catch: `eta_minutes` asks orders for the delivery point on every refresh, 50 calls per order. Copy the delivery point when the courier is assigned, and that seam drops to one call.
