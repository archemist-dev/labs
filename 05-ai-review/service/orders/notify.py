class NotifyError(Exception):
    """The message was not delivered."""


class Notifier:
    """SMS to couriers and guests. send raises NotifyError when the provider rejects the message or times out."""

    def __init__(self, sms):
        self.sms = sms

    def send(self, to: str, text: str) -> None:
        resp = self.sms.send(to, text)
        if not resp.ok:
            raise NotifyError(f"{to}: {resp.error}")


class Outbox:
    """Messages that failed to send. A worker retries them every minute until they go through."""

    def __init__(self):
        self.pending: list[tuple[str, str]] = []

    def add(self, to: str, text: str) -> None:
        self.pending.append((to, text))
