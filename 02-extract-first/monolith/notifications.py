from . import db


def send(order_id, event):
    # Reads the orders table directly to build the message.
    guest_ref, status = db.one("SELECT guest_ref, status FROM orders WHERE id = ?", (order_id,))
    db.run("INSERT INTO notifications (order_id, event, body, at) VALUES (?, ?, ?, ?)",
           (order_id, event, f"{guest_ref}: order {order_id} is {status}", db.clock))
