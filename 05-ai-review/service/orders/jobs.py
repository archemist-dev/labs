import threading


def start_view_refresher(view, interval_s: float = 1.0) -> threading.Event:
    """Background job: keeps the courier view caught up with the store. Set the returned event to stop it."""
    stop = threading.Event()

    def loop():
        while not stop.wait(interval_s):
            view.catch_up()

    threading.Thread(target=loop, name="courier-view", daemon=True).start()
    return stop
