import type { Beat } from "../../lib/track";

// Week 6 Short "Who refunds the refund?" (Your Payment Succeeded, Your Order Failed: the Saga topic), script v2 (2026-11-25).
// hook: belief. Rule 7: the turn and the first number (32 failed refund tries a year) are the second sentence. No punchline
// (cut in v2 to fit the cause chain). The opening is one large moving object (a paid card, the refund coming back, cracking).
// Ends on the follow line over the shared closing scene. EN only. Text follows the ElevenLabs take (v4, Javlon's voice).
// Numbers: data3.json (07-saga-compensation/video_data3.py asserts them against summary.json, durable saga row).
export const short3: Record<"en", Beat[]> = {
  en: [
    {
      scene: "hook",
      text: "If an order fails after payment, a {refund}refund fixes it. In my test, the refund itself {failed}failed {n}32 times a year.",
      hold: 2.2,
    },
    { scene: "chain", text: "The card is {charged}charged first. If the order is then {rejected}rejected, the money goes {back}back.", hold: 2.0 },
    { scene: "year", text: "A year of checkouts needed {refunds}1,806 refunds. I assumed {pct}2% of refund tries fail.", hold: 2.4 },
    { scene: "silent", text: "A failed refund is {silent}silent. The customer {paid}paid, and got {nothing}nothing.", hold: 2.0 },
    {
      scene: "fix",
      text: "The {fix}fix: save each refund as a {task}task, and retry it with the same {key}key, so the money never goes back {twice}twice. If it keeps failing, alert a {person}person.",
      hold: 2.4,
    },
    { scene: "daily", text: "In one real case, those customers were found by {hand}hand, in finance {reports}reports.", hold: 1.2 },
    { scene: "daily", text: "Make that a daily {job}job: every {charge}charge, matched to an {order}order.", hold: 2.4 },
    { scene: "follow", text: "Follow for one tested architecture decision a week." },
  ],
};
