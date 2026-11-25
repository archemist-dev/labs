import type { Beat } from "../../lib/track";

// Week 7 Short "The replica that brings the bloat back" (Your Table Grows While Nobody Inserts; lab 08-table-bloat), v2 2026-11-25.
// hook: belief. Rule 7: the 300,000 dead rows are the second sentence. No punchline. Ends on the follow line.
// EN only. Text follows the ElevenLabs take (v4, Javlon's voice).
// Numbers: data2.json (08-table-bloat/video_data2.py asserts them against both runs of the 10-minute test).
export const short2: Record<"en", Beat[]> = {
  en: [
    {
      scene: "hook",
      text: "Move a slow report to a {replica}replica, and your main database is {safe}safe. The main database still got {n}300,000 dead rows in ten {ten}minutes, as if the report never {moved}moved.",
      hold: 2.2,
    },
    {
      scene: "updates",
      text: "Each update leaves the old row behind, {dead}dead, and cleanup {deletes}deletes it. But cleanup must keep the dead rows a running {report}report may still {read}read.",
      hold: 2.4,
    },
    {
      scene: "feedback",
      text: "On a replica, one {setting}setting reports {back}back which dead rows the report still needs, and the main database {keeps}keeps them.",
      hold: 2.4,
    },
    { scene: "fix", text: "The {fix}fix: turn that setting {off}off. The main database stayed under {n}20,000, about the same as with no {none}report.", hold: 2.6 },
    { scene: "cost", text: "The cost: the replica now {cancels}cancels long reports.", hold: 2.2 },
    { scene: "choose", text: "Reports that take {minutes}minutes: a replica with that setting off. Reports that take {hours}hours: a {warehouse}warehouse.", hold: 2.4 },
    { scene: "follow", text: "Follow for one tested architecture decision a week." },
  ],
};
