import type { Beat } from "../../lib/track";

// Short 1 for week 1, copied from the master note (Short 1 script EN, Short 1 UZ, Short 1 RU).
// EN follows the recorded take (narration v4): no Production line, no "between your services", no "In my test,".
// {name} marks the word where a scene element appears; every language places the same markers.
// UZ and RU skip "So why send the names at all?"; the schema card then appears on {schema}.

export const short1: Record<"en" | "uz" | "ru", Beat[]> = {
  en: [
    { scene: "json", text: "Almost {half}half of this JSON is just field names." },
    { scene: "order", text: "I took a typical order. {items}Three items, an {addr}address, {status}six status changes." },
    { scene: "bytes", text: "{bytes}1,076 bytes. {names}461 of them are names. The same names, {every}in every message." },
    { scene: "bytes", text: "So why send the names at all? Both sides {know}already know them." },
    { scene: "bytes", text: "That's the idea behind {proto}Protobuf. The names live in a {schema}schema, only the {values}values travel. Same order: {b470}470 bytes. Less than half." },
    { scene: "speed", text: "And about {fast}ten times faster to encode." },
    { scene: "cost", text: "So, switch everything tomorrow? Let's {count}count. At {rps}1,000 requests per second, that's about {usd}380 dollars a year." },
    { scene: "take", text: "So here's my take. Building a {new}new service? Consider Protobuf {day1}from day one. An {old}existing one? If it's not a major {bottleneck}bottleneck, {rush}don't rush." },
    { scene: "levels", text: "Go step by step: {trim}trim the fields first. That alone cut {sixty}60%. Then {gzip}gzip. {last}Protobuf last." },
    { scene: "teaser", text: "And size was {never}never the real problem. That's the {next}next video." },
  ],
  uz: [
    { scene: "json", text: "Bu JSON'ning deyarli {half}yarmi shunchaki field nomlari." },
    { scene: "order", text: "Oddiy buyurtmani olamiz. {items}Uchta mahsulot, {addr}manzil, {status}oltita status o'zgarishi." },
    { scene: "bytes", text: "{bytes}1076 bayt. Shundan {names}461 tasi nomlar. Har bir xabarda {every}bir xil nomlar." },
    { scene: "bytes", text: "{proto}Protobuf nomlarni {schema}schema'ga olib chiqadi. Xuddi shu buyurtma: {b470}470 bayt. Yarmidan ham kam." },
    { scene: "speed", text: "Va encode qilish taxminan {fast}o'n barobar tez." },
    { scene: "cost", text: "Unda hoziroq hammasini o'tkazish kerakmi? {count}Hisoblab ko'ring. Servislar orasida sekundiga {rps}1000 ta request bo'lsa, bu yiliga taxminan {usd}380 dollar." },
    { scene: "production", text: "{keep}380 dollaringiz o'zingizga. Menga tungi {night}soat uchdagi syurprizlar kamroq bo'lsin." },
    { scene: "take", text: "Mening fikrim: {new}yangi servis qurayapsizmi? Protobuf'ni {day1}boshidan ko'rib chiqing. {old}Ishlab turgan servis bo'lsa, u katta {bottleneck}bottleneck bo'lmasa, {rush}shoshilmang." },
    { scene: "levels", text: "Bosqichma-bosqich o'ting: avval {trim}keraksiz field'larni olib tashlang. Mening testimda shuning o'zi {sixty}60% qisqartirdi. Keyin {gzip}gzip. {last}Protobuf eng oxirida." },
    { scene: "teaser", text: "Aslida {never}hajm hech qachon asosiy muammo bo'lmagan. Bu haqida {next}keyingi videoda." },
  ],
  ru: [
    { scene: "json", text: "Почти {half}половина этого JSON — просто названия полей." },
    { scene: "order", text: "Давайте возьмём обычный заказ. {items}Три позиции, {addr}адрес, {status}шесть смен статуса." },
    { scene: "bytes", text: "{bytes}1076 байт. Из них {names}461 — названия. Одни и те же, {every}в каждом сообщении." },
    { scene: "bytes", text: "{proto}Protobuf выносит названия в {schema}схему. Тот же заказ: {b470}470 байт. Меньше половины." },
    { scene: "speed", text: "И кодирует примерно в {fast}десять раз быстрее." },
    { scene: "cost", text: "Так что, завтра всё переписывать? {count}Посчитайте. При {rps}тысяче запросов в секунду между сервисами это примерно {usd}380 долларов в год." },
    { scene: "production", text: "Оставьте свои {keep}380 долларов. Дайте мне меньше сюрпризов {night}в три часа ночи." },
    { scene: "take", text: "Моё мнение: строите {new}новый сервис? Рассмотрите Protobuf {day1}с первого дня. Уже {old}работающий? Если это не серьёзный {bottleneck}bottleneck, {rush}не спешите." },
    { scene: "levels", text: "Идите поэтапно: сначала {trim}уберите лишние поля. В моём тесте только это сократило {sixty}60%. Потом {gzip}gzip. {last}Protobuf в последнюю очередь." },
    { scene: "teaser", text: "А для большинства размер {never}никогда и не был главной проблемой. Об этом в {next}следующем видео." },
  ],
};
