import type { Beat } from "../../lib/track";

// Week 6 Short "The retry that doubled orders" (Your Payment Succeeded, Your Order Failed: the Saga topic).
// Rule 7: the 1,869 is the second sentence. Rule 8: one punchline, Production, right before the year's result.
// Hypothesis 14: 3D-heavy (the call, the lost reply and the retry as packets between a phone and the order database),
// to compare with "The tail" (2D charts) on Instagram. Posted interleaved, so it stands alone and ends on the article.
// EN only. Text follows the master note until a take is recorded; then the take wins.
// Numbers: data.json (07-saga-compensation/video_data.py asserts them against summary.json).
export const short1: Record<"en", Beat[]> = {
  en: [
    { scene: "hook", text: "A {retry}retry fixes a failed call. After a payment, it gave me {n}1,869 {double}double orders a year.", hold: 2.2 },
    {
      scene: "timeline",
      text: "The order call {timeout}timed out. But the order was {created}already created. Only the {lost}reply was lost. So the retry created it {again}again.",
      hold: 2.0,
    },
    { scene: "production", text: "A timeout isn't a no. It's a maybe with a deadline.", hold: 0.4, minScene: 0 },
    {
      scene: "year",
      text: "I replayed a {year}year of checkouts, a {thousand}thousand a day, one percent {timing}timing out. About {money}£36,000 of food, sent {twice}twice.",
      hold: 1.3, // Javlon 2026-11-16: the pause after this scene was "a bit long" at 2.2
    },
    {
      scene: "key",
      text: "The fix is an idempotency {key}key. Send the checkout {id}id on every attempt. A repeat returns the {same}same order. Double orders: {zero}zero.",
      hold: 2.0,
    },
    { scene: "end", text: "A timeout means {unknown}\"I don't know\". Ask again, with the same {key}key. Full article in my {profile}profile.", hold: 1.4 },
  ],
};
