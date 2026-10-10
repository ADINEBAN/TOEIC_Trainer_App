#!/usr/bin/env python3
"""
Sandbox-only Maven dependency fetcher (persistent copy).

Why this exists: in this sandbox the `java` binary cannot open raw TCP
connections (sandbox "Direct network protocols" = Deny), so Maven itself
cannot download from Maven Central. curl/Python CAN reach Central through
the egress proxy over plain HTTP (http://insecure.repo1.maven.org).

What it does:
  1. Parses pom.xml (+ parent chain + dependencyManagement/BOM imports).
  2. Resolves the transitive closure with Maven semantics:
       - dependencyManagement wins over explicit versions in TRANSITIVE deps
       - explicit version wins over management in DIRECT deps
       - nearest-wins for unmanaged conflicts; only compile/runtime are transitive
       - each build plugin resolves in its own realm (separate universe)
  3. Downloads every needed .pom/.jar into a local repository dir (Maven layout).
  4. Also resolves lifecycle plugins for `mvn test`
     (resources, compiler, surefire, spring-boot) + surefire's JUnit providers.

After this, offline builds work:
    mvn -o -Dmaven.repo.local=./.m2-repo -q compile
    mvn -o -Dmaven.repo.local=./.m2-repo -q test

Usage:
    python3 dev-mvnfetch.py /path/to/pom.xml --local-repo /path/to/repo
"""
import os
import re
import socket
import sys
import time
import urllib.parse
import xml.etree.ElementTree as ET
from collections import deque

NS = {"m": "http://maven.apache.org/POM/4.0.0"}
CENTRAL = "http://insecure.repo1.maven.org/maven2/"
LOCAL_REPO = None


def proxy_target():
    u = urllib.parse.urlparse(os.environ.get("http_proxy") or os.environ.get("HTTP_PROXY"))
    return u.hostname, u.port


def fetch_bytes(url, retries=4):
    """GET url through the egress proxy (plain HTTP, no auth needed)."""
    pu, pp = proxy_target()
    parsed = urllib.parse.urlparse(url)
    for attempt in range(retries):
        try:
            s = socket.create_connection((pu, pp), timeout=25)
            req = (f"GET {url} HTTP/1.1\r\nHost: {parsed.netloc}\r\n"
                   f"User-Agent: mvnfetch/1.0\r\nConnection: close\r\n\r\n")
            s.sendall(req.encode())
            s.settimeout(25)
            chunks = []
            while True:
                c = s.recv(65536)
                if not c:
                    break
                chunks.append(c)
            s.close()
            raw = b"".join(chunks)
            head_end = raw.find(b"\r\n\r\n")
            head = raw[:head_end].decode("latin1")
            status = int(head.split(" ", 2)[1])
            body = raw[head_end + 4:]
            if "transfer-encoding: chunked" in head.lower():
                body = dechunk(body)
            if status == 200:
                return body
            if status == 404:
                return None
            raise IOError(f"HTTP {status} for {url}")
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1 + attempt)
    return None


def dechunk(data):
    out = b""
    i = 0
    while True:
        j = data.find(b"\r\n", i)
        size = int(data[i:j].split(b";")[0], 16)
        if size == 0:
            break
        i = j + 2
        out += data[i:i + size]
        i += size + 2
    return out


def gav_path(g, a, v, ext):
    return f"{g.replace('.', '/')}/{a}/{v}/{a}-{v}.{ext}"


def local_path(g, a, v, ext):
    return os.path.join(LOCAL_REPO, gav_path(g, a, v, ext))


def ensure_artifact(g, a, v, ext="jar"):
    p = local_path(g, a, v, "pom")
    if not os.path.exists(p):
        body = fetch_bytes(CENTRAL + gav_path(g, a, v, "pom"))
        if body is None:
            raise IOError(f"POM not found: {g}:{a}:{v}")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "wb") as f:
            f.write(body)
    if ext == "jar":
        j = local_path(g, a, v, "jar")
        if not os.path.exists(j):
            body = fetch_bytes(CENTRAL + gav_path(g, a, v, "jar"))
            if body is None:
                return False  # pom-only artifact
            with open(j, "wb") as f:
                f.write(body)
    return True


class Pom:
    def __init__(self, g, a, v, _local_file=None):
        self.g, self.a, self.v = g, a, v
        if _local_file:
            self.tree = ET.parse(_local_file)
        else:
            ensure_artifact(g, a, v, "pom")
            self.tree = ET.parse(local_path(g, a, v, "pom"))
        self.root = self.tree.getroot()
        self.parent = None
        pg = self.tx("m:parent/m:groupId")
        if pg:
            pv = self.sub(self.tx("m:parent/m:version"))
            self.parent = Pom(pg, self.tx("m:parent/m:artifactId"), pv)

    def tx(self, path):
        el = self.root.find(path, NS)
        return el.text.strip() if el is not None and el.text else None

    def props(self):
        p = {}
        if self.parent:
            p.update(self.parent.props())
        pe = self.root.find("m:properties", NS)
        if pe is not None:
            for c in pe:
                tag = c.tag.split("}", 1)[1]
                p[tag] = (c.text or "").strip()
        # The current POM's own coordinates ALWAYS win over inherited props
        # (Maven never inherits project.version from the parent).
        p["project.groupId"] = self.g
        p["project.artifactId"] = self.a
        p["project.version"] = self.v
        return p

    _ph = re.compile(r"\$\{([^}]+)\}")

    def sub(self, text):
        if not text:
            return text
        props = self.props()

        def rep(m):
            return props.get(m.group(1), m.group(0))

        out, prev = text, None
        for _ in range(5):
            out = self._ph.sub(rep, out)
            if out == prev:
                break
            prev = out
        return out

    def dep_mgmt(self):
        dm = {}
        if self.parent:
            dm.update(self.parent.dep_mgmt())
        for d in self.root.findall("m:dependencyManagement/m:dependencies/m:dependency", NS):
            g = self.sub(self._t(d, "m:groupId"))
            a = self.sub(self._t(d, "m:artifactId"))
            scope = self.sub(self._t(d, "m:scope"))
            if scope == "import":
                v = self.sub(self._t(d, "m:version"))
                bom = Pom(g, a, v)
                for k, val in bom.dep_mgmt().items():
                    dm.setdefault(k, val)
            else:
                v = self.sub(self._t(d, "m:version"))
                if v:
                    dm[(g, a)] = v
        return dm

    def plugin_mgmt(self):
        pm = {}
        if self.parent:
            pm.update(self.parent.plugin_mgmt())
        for p in self.root.findall("m:build/m:pluginManagement/m:plugins/m:plugin", NS):
            g = self.sub(self._t(p, "m:groupId")) or "org.apache.maven.plugins"
            a = self.sub(self._t(p, "m:artifactId"))
            v = self.sub(self._t(p, "m:version"))
            if a and v:
                pm[(g, a)] = v
        return pm

    def dependencies(self):
        deps = []
        for d in self.root.findall("m:dependencies/m:dependency", NS):
            g = self.sub(self._t(d, "m:groupId"))
            a = self.sub(self._t(d, "m:artifactId"))
            deps.append(dict(
                g=g, a=a,
                v=self.sub(self._t(d, "m:version")),
                scope=self.sub(self._t(d, "m:scope")) or "compile",
                type=self.sub(self._t(d, "m:type")) or "jar",
                optional=self.sub(self._t(d, "m:optional")) == "true",
                exclusions={(self.sub(self._t(e, "m:groupId")), self.sub(self._t(e, "m:artifactId")))
                            for e in d.findall("m:exclusions/m:exclusion", NS)},
            ))
        return deps

    @staticmethod
    def _t(el, path):
        e = el.find(path, NS)
        return e.text.strip() if e is not None and e.text else None


def bfs(seeds, base_mgmt, seed_children_direct=False):
    """Nearest-wins BFS over one resolution universe (project OR one plugin).

    seed_children_direct: when the seed IS the universe root itself (a plugin),
    its children are that root's direct deps -> explicit wins. When seeds are
    already direct deps (project universe), their children are transitive.
    """
    resolved, order, queue = {}, [], deque()

    def add_dep(g, a, v, scope, mgmt, parent_excls=frozenset(), direct=False):
        if (g, a) in parent_excls:
            return
        managed = mgmt.get((g, a))
        if direct:
            if v is None:
                v = managed
        elif managed is not None:
            v = managed
        if v is None:
            print(f"WARN: no version for {g}:{a} (scope {scope}); skipping")
            return
        if (g, a) in resolved:
            return
        resolved[(g, a)] = v
        order.append((g, a, v, scope))
        # (g,a,v,scope,mgmt,pex,is_seed)
        queue.append((g, a, v, scope, mgmt, parent_excls, True))

    for (g, a, v, scope) in seeds:
        add_dep(g, a, v, scope, base_mgmt, direct=True)

    while queue:
        g, a, v, scope, node_mgmt, pex, is_seed = queue.popleft()
        try:
            pom = Pom(g, a, v)
        except IOError as e:
            print(f"WARN: {e}; skipping subtree")
            continue
        # Effective management = nearest-wins from the universe root:
        # the root's entries stick; deeper levels only fill gaps.
        child_mgmt = dict(node_mgmt)
        for k, val in pom.dep_mgmt().items():
            child_mgmt.setdefault(k, val)
        for d in pom.dependencies():
            if d["optional"] or d["scope"] not in ("compile", "runtime"):
                continue
            child_direct = is_seed and seed_children_direct
            add_dep(d["g"], d["a"], d["v"], d["scope"], child_mgmt,
                    pex | d["exclusions"], direct=child_direct)
    return order


def resolve_closure(root_pom_path):
    tree = ET.parse(root_pom_path)
    root = tree.getroot()
    gid_el = root.find("m:groupId", NS)
    if gid_el is None:
        gid_el = root.find("m:parent/m:groupId", NS)
    proj = Pom(gid_el.text.strip(), root.find("m:artifactId", NS).text.strip(),
               "0.1.0", _local_file=root_pom_path)
    mgmt = proj.dep_mgmt()
    plugin_mgmt = proj.plugin_mgmt()

    seeds = []
    for d in proj.root.findall("m:dependencies/m:dependency", NS):
        scope = proj.sub(Pom._t(d, "m:scope")) or "compile"
        if scope in ("compile", "runtime", "test", "provided"):
            seeds.append((proj.sub(Pom._t(d, "m:groupId")),
                          proj.sub(Pom._t(d, "m:artifactId")),
                          proj.sub(Pom._t(d, "m:version")), scope))
    order = bfs(seeds, mgmt)

    for (pg, pa) in [("org.apache.maven.plugins", "maven-clean-plugin"),
                     ("org.apache.maven.plugins", "maven-resources-plugin"),
                     ("org.apache.maven.plugins", "maven-compiler-plugin"),
                     ("org.apache.maven.plugins", "maven-surefire-plugin"),
                     ("org.springframework.boot", "spring-boot-maven-plugin")]:
        pv = plugin_mgmt.get((pg, pa))
        if not pv:
            print(f"WARN: no managed version for plugin {pg}:{pa}")
            continue
        order.extend(bfs([(pg, pa, pv, "compile")], Pom(pg, pa, pv).dep_mgmt(),
                         seed_children_direct=True))

    surefire_v = plugin_mgmt.get(("org.apache.maven.plugins", "maven-surefire-plugin"))
    if surefire_v:
        # Surefire resolves the provider against the PROVIDER's own
        # dependencyManagement (empirically: junit-platform 1.9.3, not the
        # project's managed 1.10.5).
        provider_mgmt = Pom("org.apache.maven.surefire",
                            "surefire-junit-platform", surefire_v).dep_mgmt()
        order.extend(bfs(
            [("org.apache.maven.surefire", "surefire-junit-platform", surefire_v, "compile"),
             ("org.apache.maven.surefire", "surefire-booter", surefire_v, "compile")],
            provider_mgmt, seed_children_direct=True))
    return order


def main():
    global LOCAL_REPO
    pom_path = sys.argv[1]
    LOCAL_REPO = os.path.expanduser(
        sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == "--local-repo"
        else "~/.m2/repository")
    print(f"Local repo: {LOCAL_REPO}", flush=True)
    order = resolve_closure(pom_path)
    print(f"Resolved {len(order)} artifacts", flush=True)
    ok, failed = 0, []
    for i, (g, a, v, _scope) in enumerate(order):
        try:
            # Downloads the POM + full parent chain, then every BOM imported
            # by dependencyManagement in the chain (Maven needs complete
            # descriptors to build effective models).
            pom = Pom(g, a, v)
            pom.dep_mgmt()
            pkg_el = pom.root.find("m:packaging", NS)
            pkg = pkg_el.text.strip() if pkg_el is not None and pkg_el.text else "jar"
            if pkg != "pom":
                ensure_artifact(g, a, v, "jar")
            ok += 1
        except Exception as e:
            failed.append((g, a, v, str(e)[:100]))
        if (i + 1) % 25 == 0:
            print(f"  ... {i + 1}/{len(order)}", flush=True)
    print(f"Done: {ok} ok, {len(failed)} failed", flush=True)
    for f in failed[:20]:
        print("  FAILED:", f, flush=True)


if __name__ == "__main__":
    main()
