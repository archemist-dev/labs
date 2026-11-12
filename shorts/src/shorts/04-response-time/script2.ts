import type { Beat } from "../../lib/track";

// Week 4 Short "The tail" (What's Inside a Response Time). Hook rewritten 2026-11-12 (Javlon's pick): belief + turn
// instead of "Same server. Same code. Same load." (worn out, CLAUDE.md). Rule 7: the 56 vs 270 result is the second
// sentence. Rule 8: one punchline, Production, right before the 39%. Posted interleaved, so it stands alone and ends
// on the article. EN only. Text follows the master note until a take is recorded; then the take wins.
// Numbers: data2.json (04-response-time/video_data2.py, London client, both runs asserted).
export const short2: Record<"en", Beat[]> = {
  en: [
    { scene: "hook", text: "Most teams trust a {p99}p99 from one load test. Mine took {a}56 milliseconds in one run, and {b}270 in the next.", hold: 2.2 },
    { scene: "load", text: "The work itself never changed: {work}4.8 milliseconds, at every load. Requests waited in {line}line.", hold: 1.2 },
    { scene: "load", text: "Past {knee}70% busy, the line grows faster than the traffic. One short {stall}stall, one lost packet, and everything behind it {waits}waits.", hold: 1.8 },
    { scene: "fanout", text: "Now a page calls {calls}50 services, and waits for the {slowest}slowest.", hold: 1.4 },
    { scene: "production", text: "Every service is fast, and the page isn't.", hold: 0.4, minScene: 0 },
    { scene: "pages", text: "If {one}1% of calls are slow, {pct}39% of pages are slow.", hold: 2.2 },
    {
      scene: "take",
      text: "So find the load where your server starts to {queue}queue, and stay below it. Make {fewer}fewer calls per page. And measure the slowest 1% more than {once}once.",
      hold: 1.8,
    },
    { scene: "end", text: "Measure where the user {waits}waits, not where the server {works}works. The full test is in the {article}article.", hold: 1.4 },
  ],
};
