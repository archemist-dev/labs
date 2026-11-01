import type { Beat } from "../shorts/src/lib/track";

// Short 2 for week 2, remade 2026-11-02 (second pass: order-creation path, three dependencies, manual dispatch).
// {name} marks the word where a scene element appears. UZ and RU are paused (CLAUDE.md), so English only.
// Diagram labels stay in English.

export const short2: Record<"en", Beat[]> = {
  en: [
    { scene: "hook", text: "You're splitting a monolith. Why would the part writing {n150}150 rows per order go before {orders}orders?", hold: 1.2 },
    { scene: "path", text: "A food-delivery platform did exactly that. Creating an order touches {menu}menu, {orders}orders and {payments}payments. {break}Break one, and nobody can order. {couriers}Couriers isn't on that path.", hold: 1.6 },
    { scene: "deps", text: "And it depended on orders in only {three}three places: {assign}assign a courier, {status}send a status, {point}read the delivery point. {calls}Three calls. {tables}No shared tables.", hold: 1.6 },
    { scene: "safe", text: "When couriers were down, orders were still {taken}taken and {paid}paid. Couriers were dispatched {hand}by hand. Yeah, I know, that's {notgood}not good. It only works while the {small}fleet is small. Back then, it was {okay}okay.", hold: 1.4 },
    { scene: "growth", text: "But it had a second reason to move. One order writes {ten}10 rows. Its courier writes {c150}150. At {day}10,000 orders a day, that's over {half}half a billion rows a year. {x15}15 times the order data. The writes are {easy}easy. The {size}size isn't.", hold: 2 },
    { scene: "fix", text: "So the logs got {db}their own database from day one. Cheaper first: keep {thirty}30 days, or {split}split by day." },
    { scene: "copy", text: "And one of those three calls was {chatty}chatty: the delivery point. Copy the address {once}once, when the courier is assigned. Ask orders on every refresh: {fifty}50 lookups. Copy it: {one}one." },
    { scene: "production", text: "Move the kitchen during dinner service? {bold}Bold.", hold: 1 },
    { scene: "close", text: "You clear the storeroom first. Extract the {support}supporting services first, to {core}free the core.", hold: 2 },
  ],
};
