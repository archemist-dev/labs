import type { Beat } from "../../lib/track";

// Short 2 for week 1, as voiced (rewrite of 2026-10-29, option B + C): the rename story opens, the test is one
// schema change across the three formats from Short 1, the verdict picks the format by reader. Narrated with
// Javlon's cloned voice on ElevenLabs eleven_v4 with emotion tags; Production's line (Brian) after the Avro result.
// {name} marks the word where a scene element appears; hold is the reading time after the scene's last cue.
// UZ and RU follow once voiced.

export const short2: Record<"en", Beat[]> = {
  en: [
    { scene: "story", text: "A field was renamed {accident}by accident. Between two {releases}releases. {price}Price became {total}totalPrice. {old}Old app versions still asked for price. {crash}Crash!" },
    { scene: "alarm", hold: 1.6, text: "And that crash was the {lucky}lucky case. A crash is a {alarm}fire alarm. {loud}Loud, and it {saves}saves you." },
    { scene: "change", hold: 1.6, text: "So I tested the {formats}formats from my last video, with a change like that. One field {out}out. One field {in}in." },
    { scene: "grid", hold: 2.2, text: "{json}JSON crashed. Loud. {fine}Fine. {proto}Protobuf didn't crash. But when a new field took an old field's {slot}slot, tip came back as {zero}zero. {avro}Avro, read with the wrong {schema}schema, tip came back as {f46}forty-six." },
    { scene: "production", hold: 1.0, text: "No error. No log. My {fav}favourite kind." },
    { scene: "price", hold: 2.0, text: "A silent bug is a {gas}gas leak. Now {imagine}imagine that's a {price}price." },
    { scene: "verdict", hold: 2.0, text: "So, which format? It depends on who {reads}reads your data. A {api}public API? {json}JSON, with a written {contract}contract. Your {own}own services? {proto}Protobuf, and never reuse a {slot}slot. {kafka}Kafka, or a data lake? {avro}Avro, with a schema {registry}registry." },
    { scene: "final", text: "Pick the format by {who}who reads the data, and how long it {lives}lives." },
  ],
};
