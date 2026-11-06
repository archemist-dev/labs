class TransientError(Exception):
    """Timeout or 5xx: the provider may or may not have applied the request."""


class Http:
    """JSON over HTTPS to one provider. One attempt per call: whether a call is safe to repeat is the caller's call."""

    def __init__(self, session, base_url):
        self.session = session
        self.base_url = base_url

    def post(self, path, json, headers=None, timeout=5):
        resp = self.session.post(self.base_url + path, json=json, headers=headers or {}, timeout=timeout)
        if resp.status in (408, 500, 502, 503, 504):
            raise TransientError(f"POST {path}: {resp.status}")
        return resp
