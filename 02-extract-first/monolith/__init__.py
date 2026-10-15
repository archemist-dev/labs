"""A small food-delivery monolith: five modules, one shared database.

Written for this test with the shortcuts most monoliths grow: modules reading and
writing each other's tables directly instead of calling each other. Notifications are
sent through an in-process event queue, so they never block an order.
"""
