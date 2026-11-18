import type { Beat } from "../../lib/track";

// Week 5 Short "The checklist fix" (Your AI Reviewer Only Knows the Rules You Wrote Down), final script 2026-11-18
// (Javlon's picks 1D, 2A, 3A, 4A, 5B, 6A). Lessons rule 14: the first 2 s are a moving 3D scene that already shows the
// event (a review's comment cards with the bugs hidden among them). Rule 7: the 10 and the 110 are the second sentence.
// Rule 8: one punchline, Production, right before the fix. EN only. The take wins once recorded.
// Numbers: data2.json (05-ai-review/video_data.py asserts them against summary.json). Cards show run 1
// (106 comments, 25 blocking); spoken numbers are rounded over the 3 runs (106-113, 25-26; checklist 10-11 blocking).
export const short2: Record<"en", Beat[]> = {
  en: [
    { scene: "hook", text: "Can you spot the real bugs in this {review}review? There are {ten}10, hidden in about {comments}110 comments.", hold: 2.6 },
    {
      scene: "noise",
      text: "{prs}Twenty pull requests, ten with a {silent}silent bug: the code returns {success}success and quietly does the {wrong}wrong thing. With the default prompt, the reviewer flagged {names}names, {style}style, and {blocking}25 blocking comments for those {bugs}10 bugs.",
      hold: 2.4,
    },
    { scene: "production", text: "A hundred and ten comments. {approved}Approved.", hold: 0.4, minScene: 0 },
    {
      scene: "fix",
      text: "The fix is one {prompt}prompt. Ask only for {silent}silent failures, read the {callers}callers and config first, and post only the {blocking}blocking ones.",
      hold: 2.4,
    },
    { scene: "result", text: "Same {ten}10 bugs caught. A {tenth}tenth of the comments. Almost {every}every one is a bug.", hold: 3.0 },
    { scene: "end", text: "When every comment is a bug, people read every {comment}comment. The full test is in the {article}article.", hold: 2.4 },
  ],
};

// Visual prototype of the opening (hook + noise), silent, for Javlon to pick a look: A = PR stacks, B = review feed.
export const opening2: Record<"en", Beat[]> = { en: short2.en.slice(0, 2) };
