import type { Beat } from "../../lib/track";

// Short 1 for week 2, copied from the master note (Short 1 script EN, Short 1 UZ, Short 1 RU).
// {name} marks the word where a scene element appears; every language places the same markers.
// Diagram labels stay in English, so one set of scenes serves all three voices.

export const short1: Record<"en" | "uz" | "ru", Beat[]> = {
  en: [
    { scene: "hook", text: "Orders feels like the obvious first service to pull out of the monolith. I {count}counted what that really costs." },
    { scene: "monolith", text: "I rebuilt a small version of the kind of monolith I worked on from day one, a few years ago. {five}Five modules, one {db}shared database. I ran {order}one order through it and counted the {deps}dependencies: every table and every function that another module touches." },
    { scene: "orders", text: "Orders has {ten}ten. Ten dependencies, all on the {money}money path." },
    { scene: "production", text: "Who takes orders while you move orders?" },
    { scene: "edges", text: "The usual advice is to start small, at the edge. Menu has only {menu}two dependencies, but it runs {inside}inside every order." },
    { scene: "edges", text: "Notifications has {notif}two dependencies too, and it's sent as an event, so it {safe}can't block orders. {couriers}Couriers can't either." },
    { scene: "questions", text: "So ask three questions about every module. Is it {q1}loosely coupled? Can it {q2}block a critical flow without a fallback? Does it have {q3}its own reason to move?" },
    { scene: "verdict", text: "Notifications passes {pass2}two. Couriers passes {pass3}all three. But its reason to move {speed}isn't speed. That's the {next}next video." },
  ],
  uz: [
    { scene: "hook", text: "Orders monolitdan birinchi ajratilishi kerak bo'lgan servis bo'lib tuyuladi. Men bu qanchalik qimmatligini {count}hisoblab ko'rdim." },
    { scene: "monolith", text: "Bir necha yil oldin birinchi kundan ishlagan monolitimga o'xshash kichik model yasadim. {five}Beshta modul va bir dona {db}umumiy baza. Undan {order}bitta buyurtmani o'tkazdim va {deps}bog'lanishlarni sanadim: boshqa modul tegadigan har bir table va har bir function." },
    { scene: "orders", text: "Orders'da {ten}10 ta. 10 ta bog'lanish, va hammasi {money}pul o'tadigan biznes protsesga tegishli." },
    { scene: "production", text: "Orders'ni ko'chirayotganda buyurtmalarni kim qabul qiladi?" },
    { scene: "edges", text: "Odatda kichikdan, chetdan boshlang deyishadi. Menu'da bor-yo'g'i {menu}2 ta bog'lanish, lekin u {inside}har bir buyurtma ichida ishlaydi." },
    { scene: "edges", text: "Notifications'da ham {notif}2 ta bog'lanish, va u event qilib yuboriladi, shuning uchun buyurtmalarni {safe}to'xtata olmaydi. {couriers}Couriers ham." },
    { scene: "questions", text: "Shuning uchun har bir modulga uchta savol bering. {q1}Boshqalarga kam bog'langanmi? {q2}Fallback'siz muhim biznes jarayonni to'xtatib qo'ya oladimi? {q3}Ko'chish uchun o'z sababi bormi?" },
    { scene: "verdict", text: "Notifications {pass2}ikkitasidan o'tadi. Couriers {pass3}uchalasidan o'tdi. Lekin uning sababi {speed}tezlik emas. Bu {next}keyingi videoda." },
  ],
  ru: [
    { scene: "hook", text: "Кажется, что первым из монолита нужно выносить orders. Я {count}посчитал, во что это обходится." },
    { scene: "monolith", text: "Я собрал маленькую модель монолита, похожего на тот, с которым я работал с первого дня несколько лет назад. {five}Пять модулей, одна {db}общая база. Прогнал через него {order}один заказ и посчитал {deps}связи: каждую таблицу и каждую функцию, которых касается другой модуль." },
    { scene: "orders", text: "У orders их {ten}десять. Десять связей, и все на {money}пути денег." },
    { scene: "production", text: "А кто будет принимать заказы, пока вы переносите заказы?" },
    { scene: "edges", text: "Обычно советуют начинать с малого, с краю. У menu всего {menu}две связи, но он работает {inside}внутри каждого заказа." },
    { scene: "edges", text: "У notifications тоже {notif}две связи, и он отправляется событием, поэтому {safe}не может остановить заказы. {couriers}Couriers тоже." },
    { scene: "questions", text: "Поэтому задайте каждому модулю три вопроса. Он {q1}слабо связан с остальными? Может ли он без запасного варианта {q2}остановить критичный бизнес-процесс? Есть ли у него {q3}своя причина переехать?" },
    { scene: "verdict", text: "Notifications проходит {pass2}два. Couriers прошёл {pass3}все три. Но его причина {speed}не в скорости. Об этом в {next}следующем видео." },
  ],
};
