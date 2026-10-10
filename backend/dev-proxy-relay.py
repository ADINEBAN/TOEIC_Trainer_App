#!/usr/bin/env python3
"""
Dev-only CONNECT relay for this sandbox.

The sandbox egress proxy (hatch-egress-proxy:3128) requires
Proxy-Authorization to be sent *preemptively* on the CONNECT request:
it answers 200 to an unauthenticated CONNECT and then blackholes the
tunnel, which breaks Java/Maven (they do challenge-response auth).

This relay listens on 127.0.0.1:3129, accepts unauthenticated CONNECTs
from Maven, re-issues them upstream with Proxy-Authorization taken from
the https_proxy env var, and then relays bytes both ways.

Usage:
    python3 dev-proxy-relay.py [listen_port]   # default 3129
Point Maven at it via ~/.m2/settings.xml (or /root/.m2/settings.xml):
    <proxy><id>local</id><active>true</active><protocol>https</protocol>
      <host>127.0.0.1</host><port>3129</port>
      <nonProxyHosts>localhost</nonProxyHosts></proxy>
"""
import base64
import os
import socket
import threading
import urllib.parse
import sys

LISTEN_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3129


def upstream_target():
    u = urllib.parse.urlparse(os.environ["https_proxy"])
    auth = base64.b64encode(
        f"{urllib.parse.unquote(u.username)}:{urllib.parse.unquote(u.password)}".encode()
    ).decode()
    return u.hostname, u.port, auth


def read_head(conn):
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = conn.recv(4096)
        if not chunk:
            break
        buf += chunk
        if len(buf) > 65536:
            break
    return buf


def relay(a, b):
    try:
        while True:
            data = a.recv(65536)
            if not data:
                break
            b.sendall(data)
    except OSError:
        pass
    finally:
        for s in (a, b):
            try:
                s.shutdown(socket.SHUT_WR)
            except OSError:
                pass


def handle(client):
    try:
        head = read_head(client)
        if not head:
            client.close()
            return
        if os.environ.get("RELAY_DEBUG"):
            with open("/tmp/relay-debug.log", "ab") as f:
                f.write(b"=== CLIENT HEAD ===\n" + head + b"\n")
        header_end = head.find(b"\r\n\r\n") + 4
        headers, rest = head[:header_end], head[header_end:]
        lines = headers.decode("latin1").split("\r\n")
        request_line = lines[0]
        method = request_line.split(" ", 1)[0].upper()

        host, port, auth = upstream_target()
        up = socket.create_connection((host, port), timeout=20)

        # Inject preemptive Proxy-Authorization (strip any client-supplied one).
        # NOTE: it must be added BEFORE the blank line that terminates headers.
        out_lines = [request_line]
        for line in lines[1:]:
            if not line.strip():
                continue
            if line.lower().startswith("proxy-authorization:"):
                continue
            out_lines.append(line)
        out_lines.append(f"Proxy-Authorization: Basic {auth}")
        out_lines.append("")
        up.sendall(("\r\n".join(out_lines) + "\r\n").encode("latin1"))

        if method == "CONNECT":
            up_head = read_head(up)
            if os.environ.get("RELAY_DEBUG"):
                with open("/tmp/relay-debug.log", "ab") as f:
                    f.write(b"=== UPSTREAM HEAD ===\n" + up_head + b"\n")
            client.sendall(up_head)
            if rest:
                up.sendall(rest)
            t1 = threading.Thread(target=relay, args=(client, up), daemon=True)
            t2 = threading.Thread(target=relay, args=(up, client), daemon=True)
            t1.start()
            t2.start()
            t1.join()
            t2.join()
        else:
            # Plain-HTTP forwarding (not used by Maven for Central, but harmless).
            if rest:
                up.sendall(rest)
            relay(up, client)
        up.close()
    except Exception as e:  # noqa: BLE001 - dev tool, keep serving
        print("relay error:", e)
    finally:
        try:
            client.close()
        except OSError:
            pass


def main():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", LISTEN_PORT))
    srv.listen(50)
    print(f"CONNECT relay on 127.0.0.1:{LISTEN_PORT} -> egress proxy (auth from $https_proxy)")
    while True:
        client, _ = srv.accept()
        threading.Thread(target=handle, args=(client,), daemon=True).start()


if __name__ == "__main__":
    main()
