#!/usr/bin/env python3
"""Build assets for /birds/needs/: where are the birds I have not photographed yet?

Runs on a schedule (.github/workflows/needs.yml). Each run re-pulls the last
PULL_DAYS days from eBird and merges them into the previous snapshot, so a full
30-day picture is kept without ever re-fetching 30 days. The page only ever reads
the snapshot, so viewing it never touches eBird and can never be throttled.

Why re-pull 3 days and not just yesterday: checklists are often uploaded days
after the outing and land under the date the bird was SEEN, and reviewers reject
rarities after the fact. The overlap catches both, and a missed run heals itself.

"Needed" = any species whose eBird code is not in assets/birds/data.json, i.e.
not yet in organized/. Publishing new photos updates it with no other step.

Usage:
  EBIRD_API_KEY=... python3 .github/scripts/needs.py --prev prev.json --out needs.json
"""

import argparse
import html
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

API = "https://api.ebird.org/v2"
PT = ZoneInfo("America/Los_Angeles")
REGIONS = {
    "US-CA-001": "Alameda",
    "US-CA-075": "San Francisco",
    "US-CA-081": "San Mateo",
    "US-CA-085": "Santa Clara",
}
PULL_DAYS = 3  # eBird back=3: today and the two days before
KEEP_DAYS = 30  # history kept in the snapshot (eBird's own max for back=)
MAX_CHECKLISTS = 120  # write-up lookups per run; the backlog carries to the next run
# Same rule as ~/rba-feed: deep-water reports need a boat. The longitude sits
# ~8 miles west of Ocean Beach, so a shore-based seawatch is never caught.
PELAGIC_WEST_OF = -122.65
PELAGIC_NAMES = ("farallon", "pelagic", "offshore", "north pacific ocean", "at sea", "deep water")
# Taxonomy categories that roll up to a countable species. spuh/slash/hybrid/
# intergrade/domestic are dropped: none of them is a bird you can still "need".
COUNTABLE = {"species", "issf", "form"}

ROOT = Path(__file__).resolve().parents[2]
CALLS = 0


class Throttled(Exception):
    pass


THROTTLED = False


def api_get(path, key, retries=4):
    """GET with backoff, and a circuit breaker.

    eBird throttles per key, and once it does it can refuse everything for a
    while. Backing off call by call would then stretch a run over hours, so the
    first call still refused after its retries stops every later call; the run
    saves what it has and the next scheduled run carries on.
    """
    global CALLS, THROTTLED
    if THROTTLED:
        raise Throttled(path)
    req = urllib.request.Request(API + path, headers={"X-eBirdApiToken": key})
    for attempt in range(retries):
        CALLS += 1
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                body = json.load(r)
            time.sleep(1.0)  # eBird throttles per key; the page's live refresh shares it
            return body
        except urllib.error.HTTPError as e:
            print(f"  {e.code} {path.split('?')[0]} (attempt {attempt + 1})", file=sys.stderr, flush=True)
            if e.code not in (429, 500, 502, 503, 504):
                raise
            if attempt == retries - 1:
                if e.code == 429:
                    THROTTLED = True
                    raise Throttled(path) from e
                raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            if attempt == retries - 1:
                raise
        time.sleep(2 ** attempt * 3)  # 3, 6, 12s


def is_pelagic(o):
    name = (o.get("locName") or "").lower()
    if any(s in name for s in PELAGIC_NAMES):
        return True
    lng = o.get("lng")
    return lng is not None and lng < PELAGIC_WEST_OF


def load_taxonomy(codes, tax, key):
    """Fill tax[code] for any unknown code, in batches. Cached across runs."""
    todo = sorted({c for c in codes if c and c not in tax})
    for i in range(0, len(todo), 80):
        batch = todo[i : i + 80]
        try:
            got = api_get(f"/ref/taxonomy/ebird?species={','.join(batch)}&fmt=json", key)
        except Exception:
            return  # unresolved codes are skipped this run and retried next run
        for t in got:
            tax[t["speciesCode"]] = {
                "cat": t.get("category"),
                "reportAs": t.get("reportAs"),
                "en": t.get("comName"),
                "sci": t.get("sciName"),
                "family": t.get("familyComName"),
                "taxonOrder": t.get("taxonOrder"),
            }
        for c in batch:  # codes eBird did not return: remember, so we don't ask again
            tax.setdefault(c, {"cat": None})


def species_of(code, tax):
    """Countable species code for a taxon code, or None (spuh, hybrid, ...)."""
    t = tax.get(code) or {}
    if t.get("cat") not in COUNTABLE:
        return None
    return code if t["cat"] == "species" else t.get("reportAs")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prev", help="previous needs.json (missing/empty = first run)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--pull-days", type=int, default=None, help="override; default 3, or 30 on a first run")
    ap.add_argument("--key-file", help="read the eBird key from a file instead of $EBIRD_API_KEY")
    args = ap.parse_args()

    key = (Path(args.key_file).read_text() if args.key_file else os.environ.get("EBIRD_API_KEY", "")).strip()
    if not key:
        sys.exit("no eBird key: set EBIRD_API_KEY or pass --key-file")

    prev = {}
    if args.prev and Path(args.prev).is_file() and Path(args.prev).stat().st_size:
        prev = json.loads(Path(args.prev).read_text())
    first_run = not prev.get("obs")
    pull = args.pull_days or (KEEP_DAYS if first_run else PULL_DAYS)

    have = {s["code"] for s in json.loads((ROOT / "assets/birds/data.json").read_text())["species"]}
    tax = prev.get("taxonomy", {})
    now = datetime.now(PT)
    today = now.date()
    pull_start = (today - timedelta(days=pull - 1)).isoformat()
    keep_start = (today - timedelta(days=KEEP_DAYS - 1)).isoformat()
    errors = []

    # ---- 1. which species were reported, per county --------------------------
    # /recent is one row per species per region, so it answers "which species"
    # cheaply. One call per county (the multi-county form drops the county).
    present = {}  # species code -> set of region codes
    region_ok = 0
    for rc in REGIONS:
        try:
            rows = api_get(f"/data/obs/{rc}/recent?back={pull}&detail=full", key)
            region_ok += 1
        except Exception as ex:
            errors.append(f"recent {rc}: {ex}")
            continue
        load_taxonomy([o["speciesCode"] for o in rows], tax, key)
        for o in rows:
            sp = species_of(o["speciesCode"], tax)
            if sp:
                present.setdefault(sp, set()).add(rc)
    if not region_ok:
        sys.exit("every county failed; keeping the previous snapshot: " + "; ".join(errors))

    # ---- 2. rarities: notable returns EVERY observation, with county ----------
    fresh = []  # (species, region, row, notable)
    notable_ok = True
    notable_covered = set()  # (species, region) fully covered by notable rows
    try:
        rows = api_get(f"/data/obs/US-CA-075/recent/notable?back={pull}&detail=full&r={','.join(REGIONS)}", key)
        load_taxonomy([o["speciesCode"] for o in rows], tax, key)
        for o in rows:
            sp = species_of(o["speciesCode"], tax)
            rc = o.get("subnational2Code")
            if sp and sp not in have and rc in REGIONS:
                fresh.append((sp, rc, o, True))
                notable_covered.add((sp, rc))
                present.setdefault(sp, set()).add(rc)
    except Exception as ex:
        notable_ok = False
        errors.append(f"notable: {ex}")

    # ---- 3. every location of each needed species ----------------------------
    # One row per location (its most recent report there). Skipped where the
    # notable pull already returned every observation.
    needed = sorted(sp for sp in present if sp not in have)
    for sp in needed:
        for rc in sorted(present[sp]):
            if (sp, rc) in notable_covered:
                continue
            try:
                rows = api_get(f"/data/obs/{rc}/recent/{sp}?back={pull}&detail=full", key)
            except Exception as ex:
                errors.append(f"detail {sp}/{rc}: {ex}")
                continue
            for o in rows:
                fresh.append((sp, rc, o, False))

    # ---- 4. merge into the previous snapshot ---------------------------------
    locations = prev.get("locations", {})
    obs = {(o["sp"], o["sub"], o["loc"]): o for o in prev.get("obs", [])}
    seen_notable = set()
    for sp, rc, o, notable in fresh:
        if is_pelagic(o) or not o.get("subId"):
            continue
        k = (sp, o["subId"], o["locId"])
        rec = obs.get(k) or {"sp": sp, "sub": o["subId"], "loc": o["locId"], "ck": False}
        rec.update(
            {
                "dt": o.get("obsDt"),
                "n": o.get("howMany"),
                "valid": o.get("obsValid"),
                "reviewed": o.get("obsReviewed"),
                "notable": rec.get("notable", False) or notable,
            }
        )
        if notable:
            seen_notable.add(k)
        obs[k] = rec
        locations[o["locId"]] = {
            "name": o.get("locName"),
            "lat": o.get("lat"),
            "lng": o.get("lng"),
            "county": REGIONS[rc],
            "private": bool(o.get("locationPrivate")),
        }
    # A rarity that was in the window last run but is gone from the notable pull
    # now was rejected or deleted. Only safe to conclude if notable succeeded.
    if notable_ok:
        for k, o in list(obs.items()):
            if o.get("notable") and (o.get("dt") or "")[:10] >= pull_start and k not in seen_notable:
                del obs[k]
    # Age out, and drop anything photographed since the last run.
    obs = {k: o for k, o in obs.items() if (o.get("dt") or "")[:10] >= keep_start and o["sp"] not in have}

    # ---- 5. observers' write-ups (species-level comments, media counts) -------
    # Lives only on the checklist. Each checklist is fetched once, ever: `ck`
    # persists, so after the first run this is a handful of calls.
    # Only reports inside this pull's window get a lookup; anything older that
    # was never reached is marked done unread rather than queued forever (eBird
    # flags hundreds of reports a week as notable here, so rarities included).
    pending = {}
    for o in obs.values():
        if o.get("ck"):
            continue
        if (o.get("dt") or "")[:10] >= pull_start:
            pending.setdefault(o["sub"], []).append(o)
        else:
            o["ck"] = True
    newest_first = sorted(pending, key=lambda s: max(x["dt"] or "" for x in pending[s]), reverse=True)
    for sub in newest_first[:MAX_CHECKLISTS]:
        try:
            ck = api_get(f"/product/checklist/view/{sub}", key)
        except urllib.error.HTTPError as ex:
            if ex.code in (404, 410):  # checklist deleted: its rows are stale
                for o in pending[sub]:
                    obs.pop((o["sp"], o["sub"], o["loc"]), None)
            else:
                errors.append(f"checklist {sub}: {ex}")
            continue
        except Exception as ex:
            errors.append(f"checklist {sub}: {ex}")
            continue
        rows = ck.get("obs") or []
        load_taxonomy([r.get("speciesCode") for r in rows], tax, key)
        by_sp = {}
        for r in rows:
            sp = species_of(r.get("speciesCode"), tax)
            if sp:
                by_sp.setdefault(sp, []).append(r)
        for o in pending[sub]:
            notes, ph, au = [], 0, 0
            for r in by_sp.get(o["sp"], []):
                note = html.unescape(r.get("comments") or "").strip()  # eBird returns it HTML-encoded
                if note:
                    notes.append(note)
                m = r.get("mediaCounts") or {}
                ph += m.get("P", 0)
                au += m.get("A", 0)
            o.update({"ck": True, "cm": " / ".join(notes) or None, "ph": ph, "au": au})

    # ---- 6. write -------------------------------------------------------------
    used_sp = {o["sp"] for o in obs.values()}
    used_loc = {o["loc"] for o in obs.values()}
    rare = {o["sp"] for o in obs.values() if o.get("notable")}
    load_taxonomy(used_sp, tax, key)
    species = {
        sp: {
            "en": tax.get(sp, {}).get("en") or sp,
            "sci": tax.get(sp, {}).get("sci"),
            "family": tax.get(sp, {}).get("family"),
            "taxonOrder": tax.get(sp, {}).get("taxonOrder"),
            "rare": sp in rare,
        }
        for sp in sorted(used_sp)
    }
    out = {
        "generated_at": now.isoformat(timespec="seconds"),
        "pulled_days": pull,
        "keep_days": KEEP_DAYS,
        "regions": REGIONS,
        "photographed": len(have),
        "calls": CALLS,
        "throttled": THROTTLED,
        "errors": errors,
        "checklists_pending": max(0, len(pending) - MAX_CHECKLISTS),
        "species": species,
        "locations": {k: v for k, v in locations.items() if k in used_loc},
        "obs": sorted(obs.values(), key=lambda o: o["dt"] or "", reverse=True),
        # Cache only: saves re-asking eBird about codes seen before.
        "taxonomy": tax,
    }
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(
        f"pulled {pull}d: {len(species)} needed species, {len(out['locations'])} locations, "
        f"{len(obs)} reports, {CALLS} calls, {len(errors)} errors, "
        f"{out['checklists_pending']} write-ups pending"
    )


if __name__ == "__main__":
    main()
