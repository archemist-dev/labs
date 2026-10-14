"""One SQLite database shared by every module, as in most monoliths."""
import sqlite3

SCHEMA = """
CREATE TABLE menu_items (id INTEGER PRIMARY KEY, name TEXT, price_pence INTEGER, available INTEGER);
CREATE TABLE modifiers (id INTEGER PRIMARY KEY, item_id INTEGER, name TEXT, price_pence INTEGER);
CREATE TABLE orders (id INTEGER PRIMARY KEY, guest_ref TEXT, status TEXT, total_pence INTEGER,
                     address TEXT, courier_id INTEGER, created_at INTEGER);
CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, item_id INTEGER, qty INTEGER,
                          price_pence INTEGER);
CREATE TABLE order_status_history (order_id INTEGER, status TEXT, at INTEGER);
CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER, amount_pence INTEGER, status TEXT);
CREATE TABLE couriers (id INTEGER PRIMARY KEY, ref TEXT, vehicle TEXT);
CREATE TABLE courier_shifts (id INTEGER PRIMARY KEY, courier_id INTEGER, started_at INTEGER, ended_at INTEGER);
CREATE TABLE courier_positions (courier_id INTEGER, order_id INTEGER, lat REAL, lon REAL, at INTEGER);
CREATE TABLE notifications (id INTEGER PRIMARY KEY, order_id INTEGER, event TEXT, body TEXT, at INTEGER);
"""

# The module each table belongs to by name; the test counts every access from another module.
OWNERS = {
    "menu_items": "menu", "modifiers": "menu",
    "orders": "orders", "order_items": "orders", "order_status_history": "orders",
    "payments": "payments",
    "couriers": "couriers", "courier_shifts": "couriers", "courier_positions": "couriers",
    "notifications": "notifications",
}

conn = None
clock = 0  # simulated seconds, so runs are deterministic


def init():
    global conn, clock
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA)
    clock = 0


def one(sql, params=()):
    return conn.execute(sql, params).fetchone()


def run(sql, params=()):
    return conn.execute(sql, params).lastrowid
