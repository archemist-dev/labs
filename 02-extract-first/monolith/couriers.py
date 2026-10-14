import math

from . import db, orders

SPEED_KMH = 15  # bike in a city


def add_courier(ref, vehicle):
    courier_id = db.run("INSERT INTO couriers (ref, vehicle) VALUES (?, ?)", (ref, vehicle))
    db.run("INSERT INTO courier_shifts (courier_id, started_at) VALUES (?, ?)", (courier_id, db.clock))
    return courier_id


def assign(order_id):
    (courier_id,) = db.one("SELECT c.id FROM couriers c JOIN courier_shifts s ON s.courier_id = c.id "
                           "WHERE s.ended_at IS NULL ORDER BY c.id LIMIT 1")
    orders.assign_courier(order_id, courier_id)
    return courier_id


def report_position(courier_id, order_id, lat, lon):
    db.run("INSERT INTO courier_positions (courier_id, order_id, lat, lon, at) VALUES (?, ?, ?, ?, ?)",
           (courier_id, order_id, lat, lon, db.clock))


def eta_minutes(order_id):
    lat, lon = db.one("SELECT lat, lon FROM courier_positions WHERE order_id = ? ORDER BY at DESC LIMIT 1",
                      (order_id,))
    dest_lat, dest_lon = orders.delivery_point(order_id)
    km = math.dist((lat * 111.2, lon * 68.4), (dest_lat * 111.2, dest_lon * 68.4))  # flat-earth km near 52° N
    return round(km / SPEED_KMH * 60)


def pick_up(order_id):
    orders.set_status(order_id, "PICKED_UP")


def deliver(order_id):
    orders.set_status(order_id, "DELIVERED")
