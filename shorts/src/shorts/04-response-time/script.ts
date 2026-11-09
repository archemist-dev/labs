import type { Beat } from "../../lib/track";

// Week 4 Short "The server log lies" (What's Inside a Response Time), revised 2026-11-09 to Brand/Lessons.md
// rules 7-8 and hypothesis 11: the hook opens for a stranger, the turn (the server log's 4.8 ms) is the next beat,
// the setup (Sydney client, Frankfurt server) moves into the connection beat, one punchline (Production, before the
// 0.6 s result). Trimmed to about 53 s (Javlon, 2026-11-09: "a bit slow, 50-55 seconds"): "That was with no load" cut,
// shorter holds where the last element is short. EN only (UZ and RU paused). Text follows the master note until a take is recorded; then the take wins.
// Numbers: data.json (04-response-time/video_data.py, Sydney run 1; both runs asserted).
export const short1: Record<"en", Beat[]> = {
  en: [
    { scene: "globe", text: "Same request. Same response. {fast}0.3 seconds, then {slow}0.9. Nothing is {broken}broken.", hold: 1.2 },
    { scene: "log", text: "The server {log}log says 4.8 milliseconds. Both {both}times.", hold: 3.0 },
    { scene: "production", text: "The log says I'm {fast}fast.", hold: 0.4, minScene: 0 },
    {
      scene: "conn",
      text: "The rest is the connection, {sydney}Sydney to {frankfurt}Frankfurt. One round {open}trip to open it. One more to make it {secure}secure. Almost {setup}0.6 seconds, before your code sees a single {byte}byte.",
      hold: 1.3,
    },
    { scene: "reuse", text: "{reuse}Reuse the connection, and that cost is {gone}gone. {from}0.9 becomes {to}0.3.", hold: 1.6 },
    {
      scene: "take",
      text: "So here's my take. One connection {pool}pool for the app, not a new client per {request}request. Then measure where the user {waits}waits, not where the server {works}works.",
      hold: 1.4,
    },
    { scene: "end", text: "Under {load}load, the same request gets slow in a different way. That's the {next}next video.", hold: 0.8 },
  ],
};
