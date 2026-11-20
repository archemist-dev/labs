import type { Beat } from "../../lib/track";

// Week 6 Short "Write the order first" (Your Payment Succeeded, Your Order Failed: the Saga topic).
// hook: story. The turn is the second sentence and the first number (11 a day) lands by about 6 s (rule 7).
// Rule 8: one punchline, Production, right before the 378. The opening is one large moving object (a paid card and
// an order slot that stays empty). Ends on the follow line over the shared closing scene.
// EN only. Text follows the master note until a take is made; then the take wins.
// Numbers: data2.json (07-saga-compensation/video_data2.py asserts them against summary.json).
export const short2: Record<"en", Beat[]> = {
  en: [
    { scene: "hook", text: "The customer paid. The order was {never}never created. In a simulated year, that's {n}11 a {day}day.", hold: 2.2 },
    { scene: "story", text: "At an on-demand delivery app, these {cases}cases were fixed by {hand}hand, and some were {missed}missed.", hold: 1.6 },
    {
      scene: "refund",
      text: "The fix was a refund step: no {noorder}order, money {back}back. But what if the process {dies}dies right after the {charge}charge?",
      hold: 1.8,
    },
    { scene: "production", text: "The process died. The debt didn't.", hold: 0.4, minScene: 0 },
    { scene: "bars", text: "In my test, {n}378 charges a year, with {nothing}nothing behind them.", hold: 2.2 },
    {
      scene: "flip",
      text: "So flip it. Write the order {first}first, as {pending}pending. Then {charge}charge, with the same {key}key. A {crash}crash leaves a pending order, and a {sweeper}sweeper job {finishes}finishes it.",
      hold: 3.2, // CONFIRMED lands about 1.1 s after "finishes": it needs the reading time
    },
    {
      scene: "result",
      text: "Paid with no order: {zero}zero. Refunds: {zero2}zero.",
      hold: 2.0,
    },
    { scene: "follow", text: "Follow for one tested architecture decision a week." },
  ],
};
