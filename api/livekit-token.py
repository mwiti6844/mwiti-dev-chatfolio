from http.server import BaseHTTPRequestHandler
import base64
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
import uuid


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _jwt(payload: dict, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = ".".join(
        [
            _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(
        secret.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return signing_input + "." + _b64url(signature)


def _https_url(livekit_url: str) -> str:
    if livekit_url.startswith("wss://"):
        return "https://" + livekit_url[len("wss://") :]
    if livekit_url.startswith("ws://"):
        return "http://" + livekit_url[len("ws://") :]
    return livekit_url.rstrip("/")


def _dispatch_agent(
    livekit_url: str,
    api_key: str,
    api_secret: str,
    room_name: str,
    agent_name: str,
    metadata: str,
) -> dict:
    now = int(time.time())
    admin_token = _jwt(
        {
            "iss": api_key,
            "sub": "portfolio-dispatcher",
            "nbf": now - 5,
            "exp": now + 5 * 60,
            "video": {
                "room": room_name,
                "roomAdmin": True,
            },
        },
        api_secret,
    )
    endpoint = (
        _https_url(livekit_url)
        + "/twirp/livekit.AgentDispatchService/CreateDispatch"
    )
    body = json.dumps(
        {
            "agent_name": agent_name,
            "room": room_name,
            "metadata": metadata,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        return json.loads(response.read().decode("utf-8") or "{}")


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        livekit_url = os.environ.get("LIVEKIT_URL", "").strip()
        api_key = os.environ.get("LIVEKIT_API_KEY", "").strip()
        api_secret = os.environ.get("LIVEKIT_API_SECRET", "").strip()

        if not livekit_url or not api_key or not api_secret:
            self._send(
                503,
                {
                    "error": "LiveKit is not configured",
                    "missing": [
                        name
                        for name, value in {
                            "LIVEKIT_URL": livekit_url,
                            "LIVEKIT_API_KEY": api_key,
                            "LIVEKIT_API_SECRET": api_secret,
                        }.items()
                        if not value
                    ],
                },
            )
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            body = {}

        now = int(time.time())
        room_name = body.get("roomName") or f"david-portfolio-{uuid.uuid4().hex[:10]}"
        identity = body.get("identity") or f"visitor-{uuid.uuid4().hex[:8]}"
        name = body.get("name") or "Portfolio visitor"

        visitor_metadata = json.dumps(
            {
                "source": "portfolio",
                "visitorType": body.get("visitorType") or "unknown",
            },
            separators=(",", ":"),
        )
        agent_name = os.environ.get("LIVEKIT_AGENT_NAME", "").strip()

        if agent_name:
            try:
                _dispatch_agent(
                    livekit_url,
                    api_key,
                    api_secret,
                    room_name,
                    agent_name,
                    visitor_metadata,
                )
            except urllib.error.HTTPError as error:
                detail = error.read().decode("utf-8", errors="replace")
                self._send(
                    502,
                    {
                        "error": "LiveKit agent dispatch failed",
                        "detail": detail[:300],
                    },
                )
                return
            except Exception as error:
                self._send(
                    502,
                    {
                        "error": "LiveKit agent dispatch failed",
                        "detail": str(error),
                    },
                )
                return

        payload = {
            "iss": api_key,
            "sub": identity,
            "name": name,
            "nbf": now - 5,
            "exp": now + 15 * 60,
            "video": {
                "room": room_name,
                "roomJoin": True,
                "canPublish": True,
                "canPublishData": True,
                "canSubscribe": True,
            },
            "metadata": visitor_metadata,
        }

        self._send(
            200,
            {
                "token": _jwt(payload, api_secret),
                "url": livekit_url,
                "roomName": room_name,
                "identity": identity,
                "agentName": agent_name,
            },
        )

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _send(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt, *args):
        pass
