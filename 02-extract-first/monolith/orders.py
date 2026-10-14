import json

from . import db, notifications, payments


def create_order(guest_ref, lines, address):
    """lines: [(item_id, qty, [modifier_id, ...]), ...]"""
    priced = []
    for item_id, qty, modifier_ids in lines:
        # Prices come straight from the menu's tables, not through the menu module.
        price, available = db.one("SELECT price_pence, available FROM menu_items WHERE id = ?", (item_id,))
        if not available:
            raise ValueError(f"item {item_id} is not available")
        for modifier_id in modifier_ids:
            price += db.one("SELECT price_pence FROM modifiers WHERE id = ?", (modifier_id,))[0]
        priced.append((item_id, qty, price))
    total = sum(qty * price for _, qty, price in priced)
    order_id = db.run("INSERT INTO orders (guest_ref, status, total_pence, address, created_at) "
                      "VALUES (?, 'CREATED', ?, ?, ?)", (guest_ref, total, json.dumps(address), db.clock))
    for item_id, qty, price in priced:
        db.run("INSERT INTO order_items (order_id, item_id, qty, price_pence) VALUES (?, ?, ?, ?)",
               (order_id, item_id, qty, price))
    db.run("INSERT INTO order_status_history (order_id, status, at) VALUES (?, 'CREATED', ?)", (order_id, db.clock))
    payments.charge(order_id)
    notifications.send(order_id, "PAID")
    return order_id


def set_status(order_id, status):
    db.run("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    db.run("INSERT INTO order_status_history (order_id, status, at) VALUES (?, ?, ?)", (order_id, status, db.clock))
    notifications.send(order_id, status)


def assign_courier(order_id, courier_id):
    db.run("UPDATE orders SET courier_id = ? WHERE id = ?", (courier_id, order_id))
    set_status(order_id, "COURIER_ASSIGNED")


def delivery_point(order_id):
    (address,) = db.one("SELECT address FROM orders WHERE id = ?", (order_id,))
    point = json.loads(address)
    return point["lat"], point["lon"]
