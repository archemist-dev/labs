# 07 - The card was charged. Does the order exist?

A checkout touches two services with no shared transaction: the payment provider charges the card, then the order service creates the order. When the second step fails, times out or never runs, money is taken and no order exists. This lab replays a year of checkouts with injected faults and counts what each strategy leaves behind.

```bash
python3 simulate.py
```

Standard library only (Python 3.12+). Fixed seeds, no timings: the output is deterministic, so the machine doesn't matter and two runs must match exactly ([results-mac-2026-11-13.txt](results-mac-2026-11-13.txt)). GitHub Actions re-runs it and fails if two runs differ.

## The model

- **Scale**: a small delivery app, 1,000 checkouts a day for 365 days (365,000 in total). Basket £19.47 (£11.99 + £4.49 + £2.99 delivery), stored as pence.
- **Faults** (assumptions, not measurements):
  - The create-order call times out 1% of the time. Half of those timeouts happened after the order was created: the reply was lost. A timeout means "unknown", not "failed".
  - The order service rejects 0.5% of orders (slot gone, item sold out, validation).
  - The checkout process dies right after the charge 0.1% of the time (deploy, crash, scale-in).
  - A refund call fails 2% of the time per attempt.
- **Strategies**, each run on the same checkouts with the same rejections and crashes:
  1. **Charge, then call once**: show an error if create-order fails. Nothing else.
  2. **Retry on timeout**: up to 3 attempts, no idempotency key.
  3. **Retry + idempotency key**: the same, every attempt carries the checkout id, so a repeat returns the existing order.
  4. **Saga, state in memory**: idempotent retries forward; a rejection, or retries that end in "unknown" with no order found, triggers a refund (compensation), retried up to 3 times. If the process dies, the saga dies with it.
  5. **Saga, durable state**: the same, but the saga's state is stored before each step, so after a crash or a failed refund it is resumed (up to 5 times in the day). A still-unknown outcome waits for the next run instead of refunding.
- **Counted**: orphaned charges (charged, no order, no refund), duplicate orders (the customer gets two), refunds.

## Results (2026-11-13)

Totals for the year, 365,000 checkouts:

| Strategy | Orphaned charges | Duplicate orders | Refunds | Orphaned £ | Duplicate £ |
|---|---|---|---|---|---|
| Charge, then call once | 3,997 | 0 | 0 | 77,822 | 0 |
| Retry on timeout | 2,182 | 1,869 | 0 | 42,484 | 36,389 |
| Retry + idempotency key | 2,182 | 0 | 0 | 42,484 | 0 |
| Saga, state in memory | 378 | 0 | 1,804 | 7,360 | 0 |
| Saga, durable state | **0** | 0 | 1,806 | **0** | 0 |

## What it shows

- With no handling, about 1 checkout in 91 takes money and leaves no order: 11 a day at 1,000 orders.
- A retry alone halves the orphans and creates a new bug: every timeout that had already created the order now creates a second one (1,869 duplicate orders a year).
- The idempotency key removes the duplicates. It doesn't help rejections or crashes: a retry can't fix "no".
- Compensation (refund on rejection) removes most of the rest. What's left are the crashes: the saga's memory dies with the process.
- Durable saga state closes the last hole: zero orphaned charges in a year.
- Each fix closes one hole. The orphan count is set by the fault rates assumed above; the order in which they disappear is the point.

## Limits

- Synthetic: the fault rates are chosen, not measured. Real rates differ by provider and system; plug in your own.
- One forward step. Real checkouts have more (kitchen, courier), and each one adds a compensation.
- Refunds are assumed to succeed eventually; a refund that never succeeds needs a person.
- No customer behaviour: a customer who sees an error and pays again is not modelled (it would add double charges to the first three rows).

## Sources

- Hector Garcia-Molina and Kenneth Salem, "Sagas" (SIGMOD, 1987)
- Chris Richardson, *Microservices Patterns* (Manning, 2018); microservices.io, "Pattern: Saga"
- Stripe API docs, "Idempotent requests"
