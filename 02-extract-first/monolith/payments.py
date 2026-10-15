from . import db


def charge(order_id):
    # Reads and writes the orders tables directly: the classic monolith shortcut.
    (amount,) = db.one("SELECT total_pence FROM orders WHERE id = ?", (order_id,))
    db.run("INSERT INTO payments (order_id, amount_pence, status) VALUES (?, ?, 'CAPTURED')", (order_id, amount))
    db.run("UPDATE orders SET status = 'PAID' WHERE id = ?", (order_id,))
    db.run("INSERT INTO order_status_history (order_id, status, at) VALUES (?, 'PAID', ?)", (order_id, db.clock))
