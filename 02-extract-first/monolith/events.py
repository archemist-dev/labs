"""In-process event queue: the publisher doesn't wait for the subscriber, so a failed
notification can't fail the order. A worker drains the queue after the request."""
from collections import deque

queue = deque()
subscribers = {}
on_publish = None  # set by the test to record publisher -> subscriber links


def subscribe(name, fn):
    subscribers.setdefault(name, []).append(fn)


def publish(name, **payload):
    if on_publish:
        on_publish(name, subscribers.get(name, []))
    queue.append((name, payload))


def drain():
    while queue:
        name, payload = queue.popleft()
        for fn in subscribers.get(name, []):
            fn(**payload)
