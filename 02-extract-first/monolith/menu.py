from . import db


def add_item(name, price_pence, modifiers=()):
    item_id = db.run("INSERT INTO menu_items (name, price_pence, available) VALUES (?, ?, 1)", (name, price_pence))
    for mod_name, mod_price in modifiers:
        db.run("INSERT INTO modifiers (item_id, name, price_pence) VALUES (?, ?, ?)", (item_id, mod_name, mod_price))
    return item_id


def set_available(item_id, available):
    db.run("UPDATE menu_items SET available = ? WHERE id = ?", (int(available), item_id))
