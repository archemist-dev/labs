"""The menu: schema, deterministic seed data, and the uncached build (real queries and serialization, no sleep).

One store's menu: categories, items with sizes and prices, modifier groups and their options, availability per store.
Prices are GBP in integer pence. Sizes come from the environment so a quick check can use a small menu.
"""
import gzip
import json
import os
import random

STORES = int(os.environ.get("STORES", 50))
CATEGORIES = int(os.environ.get("CATEGORIES", 14))
ITEMS = int(os.environ.get("ITEMS", 220))
GROUPS = int(os.environ.get("GROUPS", 60))
BUILD = os.environ.get("BUILD", "batched")  # batched: one query per table; orm: per-item queries (N+1)
STORE = 1  # the store whose menu is read and edited

SCHEMA = """
DROP TABLE IF EXISTS availability, item_modifier_groups, modifiers, modifier_groups, item_sizes, items,
    categories, menu_version;
CREATE TABLE categories (id int PRIMARY KEY, name text NOT NULL, position int NOT NULL);
CREATE TABLE items (
    id int PRIMARY KEY, category_id int NOT NULL REFERENCES categories, name text NOT NULL,
    description text NOT NULL, allergens text[] NOT NULL, calories int NOT NULL, position int NOT NULL);
CREATE INDEX ON items (category_id);
CREATE TABLE item_sizes (
    id int PRIMARY KEY, item_id int NOT NULL REFERENCES items, name text NOT NULL,
    price_pence int NOT NULL, position int NOT NULL);
CREATE INDEX ON item_sizes (item_id);
CREATE TABLE modifier_groups (id int PRIMARY KEY, name text NOT NULL, min_select int NOT NULL, max_select int NOT NULL);
CREATE TABLE modifiers (
    id int PRIMARY KEY, group_id int NOT NULL REFERENCES modifier_groups, name text NOT NULL,
    price_pence int NOT NULL, position int NOT NULL);
CREATE INDEX ON modifiers (group_id);
CREATE TABLE item_modifier_groups (
    item_id int NOT NULL REFERENCES items, group_id int NOT NULL REFERENCES modifier_groups, position int NOT NULL,
    PRIMARY KEY (item_id, group_id));
CREATE TABLE availability (
    store_id int NOT NULL, item_id int NOT NULL REFERENCES items, available bool NOT NULL,
    PRIMARY KEY (store_id, item_id));
CREATE TABLE menu_version (store_id int PRIMARY KEY, version int NOT NULL, updated_at timestamptz NOT NULL);
"""

CATEGORY_NAMES = ["Pizzas", "Burgers", "Wraps", "Salads", "Pasta", "Sides", "Chicken", "Vegetarian", "Kids",
                  "Desserts", "Hot drinks", "Soft drinks", "Meal deals", "Sauces", "Breakfast", "Specials"]
NOUNS = ["Margherita", "Pepperoni", "Smokehouse", "Garden", "Hawaiian", "Four Cheese", "Spicy Bean", "Halloumi",
         "Chicken Caesar", "Classic", "BBQ", "Buffalo", "Mushroom", "Meatball", "Falafel", "Tuna", "Veggie Supreme",
         "Garlic", "Lemon", "Chocolate", "Salted Caramel", "Ploughman's", "Cajun", "Pesto"]
DISHES = ["Pizza", "Burger", "Wrap", "Bowl", "Salad", "Pasta", "Wings", "Fries", "Melt", "Brownie", "Shake"]
SIZES = [("Small", 0), ("Regular", 250), ("Large", 500)]
GROUP_NAMES = ["Extra toppings", "Choose your crust", "Dips", "Add a side", "Add a drink", "Cheese", "Sauce",
               "Spice level", "Remove", "Upgrade to a meal", "Bread", "Dressing"]
OPTIONS = ["Mozzarella", "Cheddar", "Jalapenos", "Red onion", "Sweetcorn", "Olives", "Peppers", "Pineapple",
           "Bacon", "Chicken", "Garlic dip", "BBQ dip", "Sour cream", "Hot sauce", "Thin crust", "Stuffed crust",
           "Gluten-free base", "Coleslaw", "Onion rings", "Lemonade 330ml", "Cola 330ml", "Water 500ml"]
ALLERGENS = ["gluten", "milk", "egg", "soya", "mustard", "sesame", "celery", "nuts"]


def seed(conn):
    """Create and fill the tables. Deterministic: the same menu on every run."""
    rnd = random.Random(42)
    with conn.cursor() as cur:
        cur.execute(SCHEMA)
        cur.executemany("INSERT INTO categories VALUES (%s, %s, %s)",
                        [(c, CATEGORY_NAMES[(c - 1) % len(CATEGORY_NAMES)], c) for c in range(1, CATEGORIES + 1)])
        items, sizes, links = [], [], []
        for i in range(1, ITEMS + 1):
            name = f"{rnd.choice(NOUNS)} {rnd.choice(DISHES)}"
            desc = (f"{name} made fresh to order with {rnd.choice(OPTIONS).lower()} and "
                    f"{rnd.choice(OPTIONS).lower()}, served hot. Ask the store about allergens.")
            items.append((i, rnd.randint(1, CATEGORIES), name, desc, rnd.sample(ALLERGENS, rnd.randint(0, 3)),
                          rnd.randint(180, 1200), i))
            base = rnd.choice([349, 499, 699, 899, 999, 1199, 1399])
            for s, (size, extra) in enumerate(SIZES[:rnd.choice([1, 3, 3])]):
                sizes.append((len(sizes) + 1, i, size, base + extra, s))
            for p, g in enumerate(rnd.sample(range(1, GROUPS + 1), rnd.randint(2, 5))):
                links.append((i, g, p))
        cur.executemany("INSERT INTO items VALUES (%s, %s, %s, %s, %s, %s, %s)", items)
        cur.executemany("INSERT INTO item_sizes VALUES (%s, %s, %s, %s, %s)", sizes)
        groups, mods = [], []
        for g in range(1, GROUPS + 1):
            n = rnd.randint(4, 10)
            groups.append((g, GROUP_NAMES[(g - 1) % len(GROUP_NAMES)], 0, rnd.choice([1, 3, n])))
            for p, opt in enumerate(rnd.sample(OPTIONS, n)):
                mods.append((len(mods) + 1, g, opt, rnd.choice([0, 0, 50, 99, 149, 199]), p))
        cur.executemany("INSERT INTO modifier_groups VALUES (%s, %s, %s, %s)", groups)
        cur.executemany("INSERT INTO modifiers VALUES (%s, %s, %s, %s, %s)", mods)
        cur.executemany("INSERT INTO item_modifier_groups VALUES (%s, %s, %s)", links)
        cur.executemany("INSERT INTO availability VALUES (%s, %s, %s)",
                        [(s, i, rnd.random() > 0.05) for s in range(1, STORES + 1) for i in range(1, ITEMS + 1)])
        cur.execute("INSERT INTO menu_version VALUES (%s, 1, now())", (STORE,))
        cur.execute("ANALYZE")
    conn.commit()


def build(conn):
    """The uncached path: read the store's menu with ordinary queries, nest it, serialize and gzip it.

    Returns (version, gzipped JSON). batched: five queries in all; orm: three per item and one per modifier group.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM menu_version WHERE store_id = %s", (STORE,))
        version = cur.fetchone()[0]
        cur.execute("SELECT id, name FROM categories ORDER BY position")
        categories = [{"id": cid, "name": name, "items": []} for cid, name in cur.fetchall()]
        by_cat = {c["id"]: c for c in categories}
        cur.execute("""
            SELECT i.id, i.category_id, i.name, i.description, i.allergens, i.calories
            FROM items i JOIN availability a ON a.item_id = i.id AND a.store_id = %s AND a.available
            ORDER BY i.category_id, i.position""", (STORE,))
        items = {}
        for iid, cid, name, desc, allergens, kcal in cur.fetchall():
            item = {"id": iid, "name": name, "description": desc, "allergens": allergens, "calories": kcal,
                    "sizes": [], "modifier_groups": []}
            items[iid] = item
            by_cat[cid]["items"].append(item)
        if BUILD == "orm":
            _load_per_item(cur, items)
            return _finish(conn, version, categories)
        ids = list(items)
        cur.execute("SELECT item_id, id, name, price_pence FROM item_sizes WHERE item_id = ANY(%s) "
                    "ORDER BY item_id, position", (ids,))
        for iid, sid, name, price in cur.fetchall():
            items[iid]["sizes"].append({"id": sid, "name": name, "price_pence": price})
        cur.execute("""
            SELECT l.item_id, g.id, g.name, g.min_select, g.max_select, m.id, m.name, m.price_pence
            FROM item_modifier_groups l
            JOIN modifier_groups g ON g.id = l.group_id
            JOIN modifiers m ON m.group_id = g.id
            WHERE l.item_id = ANY(%s)
            ORDER BY l.item_id, l.position, m.position""", (ids,))
        last = None
        for iid, gid, gname, gmin, gmax, mid, mname, mprice in cur.fetchall():
            if last != (iid, gid):
                group = {"id": gid, "name": gname, "min": gmin, "max": gmax, "options": []}
                items[iid]["modifier_groups"].append(group)
                last = (iid, gid)
            group["options"].append({"id": mid, "name": mname, "price_pence": mprice})
    return _finish(conn, version, categories)


def _load_per_item(cur, items):
    """How an ORM walks the relations by default: sizes per item, groups per item, options per group."""
    for iid, item in items.items():
        cur.execute("SELECT id, name, price_pence FROM item_sizes WHERE item_id = %s ORDER BY position", (iid,))
        item["sizes"] = [{"id": sid, "name": name, "price_pence": price} for sid, name, price in cur.fetchall()]
        cur.execute("""
            SELECT g.id, g.name, g.min_select, g.max_select FROM item_modifier_groups l
            JOIN modifier_groups g ON g.id = l.group_id WHERE l.item_id = %s ORDER BY l.position""", (iid,))
        for gid, gname, gmin, gmax in cur.fetchall():
            cur.execute("SELECT id, name, price_pence FROM modifiers WHERE group_id = %s ORDER BY position", (gid,))
            item["modifier_groups"].append({"id": gid, "name": gname, "min": gmin, "max": gmax, "options": [
                {"id": mid, "name": mname, "price_pence": mprice} for mid, mname, mprice in cur.fetchall()]})


def _finish(conn, version, categories):
    conn.commit()
    body = {"store_id": STORE, "currency": "GBP", "version": version, "categories": categories}
    return version, gzip.compress(json.dumps(body, separators=(",", ":")).encode(), compresslevel=6)


def edit(conn):
    """One menu edit by staff: a price changes by 10p and the menu version goes up. Returns the new version."""
    with conn.cursor() as cur:
        cur.execute("UPDATE item_sizes SET price_pence = price_pence + 10 WHERE id = 1")
        cur.execute("UPDATE menu_version SET version = version + 1, updated_at = now() WHERE store_id = %s "
                    "RETURNING version", (STORE,))
        version = cur.fetchone()[0]
    conn.commit()
    return version
