import type { Beat } from "../../lib/track";

// Week 5 Short "One deleted comment" (Your AI Reviewer Only Knows the Rules You Wrote Down), from the master note's
// script (Javlon's picks, 2026-11-09). Rule 7: the 3 of 3 result is the second sentence. Rule 8: one punchline,
// Production, right before the 50p result. Hypothesis 11: opens on its own turn, not as a sequel.
// Ending changed 2026-11-12: weeks are interleaved now, so this Short points to the article, not to "The checklist fix".
// EN only (UZ and RU paused). Text follows the master note until a take is recorded; then the take wins.
// Numbers: data.json (05-ai-review README, prs.py b03, grade files).
export const short1: Record<"en", Beat[]> = {
  en: [
    {
      scene: "hook",
      text: "I deleted one {comment}comment, and the AI reviewer stopped seeing a bug. {with}With the comment, it blocked the bug 3 times out of 3. {without}Without it: {missed}missed, 3 of 3.",
      hold: 2.2,
    },
    { scene: "order", text: "The bug: a 10% {promo}promo that also comes off {delivery}delivery. The {terms}terms say items only.", hold: 2.0 },
    { scene: "production", text: "Tests are {green}green. I'm fine.", hold: 0.4, minScene: 0 },
    { scene: "loss", text: "{lost}50p lost per promo order, no {error}error. The reviewer called it {quote}a business decision.", hold: 3.0 },
    {
      scene: "stale",
      text: "A human reviewer made the same miss. {copy}Courier orders were read from a copy, seconds {behind}behind, and went to the {wrong}wrong courier. The rule {rule}that copy is for screens was written {nowhere}nowhere.",
      hold: 2.0,
    },
    { scene: "fix", text: "So write the rule next to the {code}code. Better, make it a {test}test, so {ci}CI catches what every reviewer misses.", hold: 2.2 },
    { scene: "end", text: "The full test is in the {article}article.", hold: 1.6 },
  ],
};
