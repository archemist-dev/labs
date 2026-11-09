class CourierView:
    """Read model of every courier's chain, for the dispatcher screen. Rebuilt from store events by a background job.

    Eventually consistent: it lags the store by a few seconds, more under load. Display only; decisions read the store.
    """

    def __init__(self, store):
        self.store = store
        self._position = 0
        self._chains: dict[str, list[str]] = {}

    def catch_up(self) -> None:
        """Called by the background job."""
        events = self.store.events_since(self._position)
        for courier_id, order_ids in events:
            self._chains[courier_id] = list(order_ids)
        self._position += len(events)

    def courier_ids(self) -> list[str]:
        return list(self._chains)

    def chain(self, courier_id: str) -> list[str]:
        return list(self._chains.get(courier_id, []))
