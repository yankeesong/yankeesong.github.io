/* Birds I still need: recent eBird reports of species not yet photographed.

   Reads a snapshot (needs.json on the `data` branch) written a few times a day
   by .github/workflows/needs.yml, so opening the page makes no eBird calls.
   "Refresh now" is the only live path: it re-pulls the last two days with the
   viewer's own key, kept in this browser only. */

(function () {
  "use strict";

  var BASE = document.currentScript.src.replace(/\/needs\.js.*$/, "");
  var SNAPSHOT = "https://raw.githubusercontent.com/yankeesong/yankeesong.github.io/data/needs.json";
  var API = "https://api.ebird.org/v2";
  var KEY_STORE = "birds-needs:ebird-key";
  var PELAGIC_WEST_OF = -122.65;
  var PELAGIC_NAMES = ["farallon", "pelagic", "offshore", "north pacific ocean", "at sea", "deep water"];
  var COUNTABLE = { species: 1, issf: 1, form: 1 };

  var S = {
    snap: null,
    have: {}, // eBird codes already photographed
    obs: [], // merged reports
    map: null,
    layer: null,
    selected: null, // species code, or null for all
    liveAt: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function storeGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function storeSet(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  }

  /* ---------- dates (eBird times are local Pacific) ---------- */

  function ptDate(d) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(d || new Date());
  }
  function addDays(iso, n) {
    var d = new Date(iso + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function dayLabel(dt) {
    var day = (dt || "").slice(0, 10);
    var today = ptDate();
    var time = (dt || "").slice(11, 16);
    var diff = Math.round((new Date(today) - new Date(day)) / 864e5);
    var rel = diff === 0 ? "today" : diff === 1 ? "yesterday" : diff + "d ago";
    var md = new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return rel + " · " + md + (time ? " " + time : "");
  }
  function ago(iso) {
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4);
    if (m < 60) return m + " min ago";
    if (m < 60 * 36) return Math.round(m / 60) + " h ago";
    return Math.round(m / 1440) + " days ago";
  }

  /* ---------- filtering ---------- */

  function filters() {
    var days = +document.querySelector("#needs-window button[aria-pressed='true']").dataset.days;
    return {
      since: addDays(ptDate(), -(days - 1)),
      county: $("needs-county").value,
      rareOnly: $("needs-rare").checked,
      q: $("needs-search").value.trim().toLowerCase(),
      sort: $("needs-sort").value,
    };
  }

  function sp(code) {
    return S.snap.species[code] || {};
  }
  function loc(id) {
    return S.snap.locations[id] || {};
  }

  // Reports passing the time/county/rarity/search filters.
  function visibleObs(f) {
    return S.obs.filter(function (o) {
      if (S.have[o.sp]) return false; // photographed after the snapshot was taken
      if ((o.dt || "").slice(0, 10) < f.since) return false;
      if (f.county && loc(o.loc).county !== f.county) return false;
      if (f.q && (sp(o.sp).en + " " + sp(o.sp).sci + " " + sp(o.sp).family).toLowerCase().indexOf(f.q) === -1) return false;
      return true;
    });
  }

  function apply() {
    var f = filters();
    var rows = visibleObs(f);
    // eBird flags notability per report (and per county and season), so a
    // species is "rare" only while one of its reports in this window is flagged.
    S.rareNow = {};
    rows.forEach(function (o) {
      if (o.notable) S.rareNow[o.sp] = 1;
    });
    if (f.rareOnly)
      rows = rows.filter(function (o) {
        return o.notable;
      });

    // species -> {code, n locations, latest report}
    var bySp = {};
    rows.forEach(function (o) {
      var e = (bySp[o.sp] = bySp[o.sp] || { code: o.sp, locs: {}, latest: o });
      e.locs[o.loc] = 1;
      if ((o.dt || "") > (e.latest.dt || "")) e.latest = o;
    });
    var list = Object.keys(bySp).map(function (k) {
      var e = bySp[k];
      e.nLocs = Object.keys(e.locs).length;
      return e;
    });
    if (f.sort === "recent")
      list.sort(function (a, b) {
        return (b.latest.dt || "").localeCompare(a.latest.dt || "");
      });
    else if (f.sort === "spots")
      list.sort(function (a, b) {
        return b.nLocs - a.nLocs;
      });
    else
      list.sort(function (a, b) {
        return (sp(a.code).taxonOrder || 0) - (sp(b.code).taxonOrder || 0);
      });

    if (S.selected && !bySp[S.selected]) S.selected = null;
    var mapRows = S.selected
      ? rows.filter(function (o) {
          return o.sp === S.selected;
        })
      : rows;

    renderStats(list, rows);
    renderList(list);
    renderMarkers(mapRows);
    renderDetail(mapRows);
  }

  /* ---------- rendering ---------- */

  function renderStats(list, rows) {
    var locs = {};
    rows.forEach(function (o) {
      locs[o.loc] = 1;
    });
    var nRare = list.filter(function (e) {
      return S.rareNow[e.code];
    }).length;
    $("needs-stats").textContent =
      list.length +
      " species I still need" +
      (nRare ? " (" + nRare + " rare)" : "") +
      " · " +
      Object.keys(locs).length +
      (Object.keys(locs).length === 1 ? " location" : " locations");
    var upd = "snapshot " + ago(S.snap.generated_at);
    if (S.liveAt) upd += " · live refresh " + ago(S.liveAt);
    $("needs-updated").textContent = upd;
  }

  function renderList(list) {
    var box = $("needs-list");
    box.innerHTML = "";
    $("needs-empty").hidden = list.length > 0;
    list.forEach(function (e) {
      var s = sp(e.code);
      var row = document.createElement("button");
      row.type = "button";
      row.className = "needs-sp" + (S.selected === e.code ? " on" : "");
      row.innerHTML = '<span class="nm"></span>' + (S.rareNow[e.code] ? '<span class="rare">rare</span>' : "") + '<span class="sub"></span>';
      row.querySelector(".nm").textContent = s.en;
      row.querySelector(".sub").textContent = e.nLocs + (e.nLocs === 1 ? " spot" : " spots") + " · " + dayLabel(e.latest.dt);
      row.addEventListener("click", function () {
        S.selected = S.selected === e.code ? null : e.code;
        apply();
        if (S.selected) $("needs-map").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      box.appendChild(row);
    });
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function groupByLoc(rows) {
    var by = {};
    rows.forEach(function (o) {
      var e = (by[o.loc] = by[o.loc] || { loc: o.loc, sp: {}, rare: false, latest: "" });
      var cur = e.sp[o.sp];
      if (!cur || (o.dt || "") > (cur.dt || "")) e.sp[o.sp] = o;
      if (o.notable) e.rare = true;
      if ((o.dt || "") > e.latest) e.latest = o.dt || "";
    });
    return by;
  }

  function ensureMap() {
    if (S.map) return;
    S.map = L.map("needs-map", { preferCanvas: true, scrollWheelZoom: false }).setView([37.55, -122.2], 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · sightings: <a href="https://ebird.org">eBird</a>',
    }).addTo(S.map);
  }

  function renderMarkers(rows) {
    ensureMap();
    if (S.layer) S.map.removeLayer(S.layer);
    S.layer = L.featureGroup();
    var theme = cssVar("--global-theme-color", "#2c7be5");
    var rareColor = "#e8590c";
    var by = groupByLoc(rows);
    // Draw small counts first so the richest spots sit on top.
    Object.keys(by)
      .map(function (k) {
        return by[k];
      })
      .sort(function (a, b) {
        return Object.keys(a.sp).length - Object.keys(b.sp).length;
      })
      .forEach(function (e) {
        var L0 = loc(e.loc);
        if (L0.lat == null) return;
        var n = Object.keys(e.sp).length;
        var mk = L.circleMarker([L0.lat, L0.lng], {
          radius: Math.min(22, 5 + Math.sqrt(n) * 3.2),
          color: "#fff",
          weight: 1.5,
          fillColor: e.rare ? rareColor : theme,
          fillOpacity: 0.85,
        });
        mk.bindTooltip(esc(L0.name) + " — " + n + " species", { direction: "top" });
        mk.bindPopup(
          function () {
            return popupHtml(e);
          },
          { maxWidth: 320, maxHeight: 360 }
        );
        S.layer.addLayer(mk);
      });
    S.map.addLayer(S.layer);
    if (S.selected && S.layer.getLayers().length) S.map.fitBounds(S.layer.getBounds(), { padding: [30, 30], maxZoom: 13 });
  }

  function obsLine(o, withName) {
    var s = sp(o.sp);
    var bits = [];
    if (withName) bits.push("<b>" + esc(s.en) + "</b>" + (o.notable ? ' <span class="rare">rare</span>' : ""));
    var meta = dayLabel(o.dt) + (o.n ? " · " + o.n : "");
    if (o.valid === false) meta += " · unconfirmed";
    if (o.ph) meta += " · " + o.ph + " photo" + (o.ph > 1 ? "s" : "");
    if (o.au) meta += " · audio";
    bits.push('<a href="https://ebird.org/checklist/' + esc(o.sub) + '" target="_blank" rel="noopener">' + esc(meta) + "</a>");
    if (o.cm) bits.push('<div class="cm">' + esc(o.cm) + "</div>");
    return bits.join(" ");
  }

  function placeLinks(id) {
    var L0 = loc(id);
    var out = [];
    if (!L0.private) out.push('<a href="https://ebird.org/hotspot/' + esc(id) + '" target="_blank" rel="noopener">eBird hotspot</a>');
    out.push(
      '<a href="https://www.google.com/maps/dir/?api=1&destination=' + L0.lat + "," + L0.lng + '" target="_blank" rel="noopener">directions</a>'
    );
    return out.join(" · ");
  }

  function popupHtml(e) {
    var L0 = loc(e.loc);
    var items = Object.keys(e.sp)
      .map(function (k) {
        return e.sp[k];
      })
      .sort(function (a, b) {
        return (b.notable ? 1 : 0) - (a.notable ? 1 : 0) || (b.dt || "").localeCompare(a.dt || "");
      });
    return (
      '<div class="needs-pop"><div class="ttl">' +
      esc(L0.name) +
      '</div><div class="where">' +
      esc(L0.county) +
      " · " +
      placeLinks(e.loc) +
      "</div><ul>" +
      items
        .map(function (o) {
          return "<li>" + obsLine(o, true) + "</li>";
        })
        .join("") +
      "</ul></div>"
    );
  }

  // Under the map when one species is selected: every place it was reported.
  function renderDetail(rows) {
    var box = $("needs-detail");
    if (!S.selected) {
      box.hidden = true;
      return;
    }
    var s = sp(S.selected);
    var by = groupByLoc(rows);
    var places = Object.keys(by).sort(function (a, b) {
      return by[b].latest.localeCompare(by[a].latest);
    });
    box.hidden = false;
    box.innerHTML =
      '<div class="hd"><span><b>' +
      esc(s.en) +
      "</b> <i>" +
      esc(s.sci) +
      "</i>" +
      (S.rareNow[S.selected] ? ' <span class="rare">rare</span>' : "") +
      '</span><a href="https://ebird.org/species/' +
      esc(S.selected) +
      '" target="_blank" rel="noopener">eBird</a> <button type="button" id="needs-clear">show all species</button></div><ul>' +
      places
        .map(function (id) {
          var reps = rows
            .filter(function (o) {
              return o.loc === id;
            })
            .sort(function (a, b) {
              return (b.dt || "").localeCompare(a.dt || "");
            });
          return (
            '<li><div class="ttl">' +
            esc(loc(id).name) +
            ' <span class="where">' +
            esc(loc(id).county) +
            " · " +
            placeLinks(id) +
            "</span></div>" +
            reps
              .map(function (o) {
                return '<div class="rep">' + obsLine(o, false) + "</div>";
              })
              .join("") +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
    $("needs-clear").addEventListener("click", function () {
      S.selected = null;
      apply();
    });
  }

  /* ---------- live refresh (viewer's own key) ---------- */

  function liveGet(path, key) {
    var tries = 0;
    function go() {
      return fetch(API + path, { headers: { "X-eBirdApiToken": key } }).then(function (r) {
        if ((r.status === 429 || r.status >= 500) && tries++ < 4) {
          return new Promise(function (res) {
            setTimeout(res, 1500 * Math.pow(2, tries));
          }).then(go);
        }
        if (r.status === 401 || r.status === 403) throw new Error("key");
        if (!r.ok) throw new Error("eBird " + r.status);
        return r.json();
      });
    }
    return go();
  }

  // Run tasks a few at a time, so a refresh never bursts eBird.
  // A rejected key aborts the run; any other failed call just loses that species.
  function pool(tasks, n, onTick) {
    var i = 0,
      done = 0,
      failed = false;
    return new Promise(function (resolve, reject) {
      if (!tasks.length) return resolve();
      function next() {
        if (failed || i >= tasks.length) return;
        var t = tasks[i++];
        t()
          .catch(function (e) {
            if (e.message === "key") {
              failed = true;
              reject(e);
            }
          })
          .then(function () {
            if (failed) return;
            onTick(++done, tasks.length);
            if (done === tasks.length) resolve();
            else next();
          });
      }
      for (var k = 0; k < n; k++) next();
    });
  }

  function speciesOf(code) {
    var t = (S.snap.taxonomy || {})[code];
    if (!t || !COUNTABLE[t.cat]) return null;
    return t.cat === "species" ? code : t.reportAs;
  }

  function isPelagic(o) {
    var name = (o.locName || "").toLowerCase();
    return (
      PELAGIC_NAMES.some(function (s) {
        return name.indexOf(s) !== -1;
      }) ||
      (o.lng != null && o.lng < PELAGIC_WEST_OF)
    );
  }

  function ensureTaxonomy(codes, key) {
    var tax = (S.snap.taxonomy = S.snap.taxonomy || {});
    var todo = codes.filter(function (c, i) {
      return c && !tax[c] && codes.indexOf(c) === i;
    });
    if (!todo.length) return Promise.resolve();
    return liveGet("/ref/taxonomy/ebird?species=" + todo.slice(0, 200).join(",") + "&fmt=json", key).then(function (rows) {
      rows.forEach(function (t) {
        tax[t.speciesCode] = {
          cat: t.category,
          reportAs: t.reportAs,
          en: t.comName,
          sci: t.sciName,
          family: t.familyComName,
          taxonOrder: t.taxonOrder,
        };
      });
      todo.forEach(function (c) {
        tax[c] = tax[c] || { cat: null };
      });
    });
  }

  function refreshNow() {
    var key = storeGet(KEY_STORE);
    if (!key) {
      $("needs-keyrow").hidden = false;
      $("needs-key").focus();
      return;
    }
    var btn = $("needs-refresh");
    btn.disabled = true;
    btn.textContent = "refreshing…";
    var regions = S.snap.regions;
    var codes = Object.keys(regions);
    var present = {}; // species -> {region: 1}
    var covered = {};
    var fresh = [];

    function note(o, rc, notable) {
      var code = speciesOf(o.speciesCode);
      if (!code || S.have[code] || !o.subId || isPelagic(o)) return;
      fresh.push({ code: code, rc: rc, o: o, notable: notable });
    }

    Promise.all(
      codes.map(function (rc) {
        return liveGet("/data/obs/" + rc + "/recent?back=2&detail=full", key).then(function (rows) {
          return { rc: rc, rows: rows };
        });
      })
    )
      .then(function (res) {
        var all = [];
        res.forEach(function (r) {
          r.rows.forEach(function (o) {
            all.push(o.speciesCode);
          });
        });
        return liveGet("/data/obs/" + codes[0] + "/recent/notable?back=2&detail=full&r=" + codes.join(","), key).then(function (notable) {
          notable.forEach(function (o) {
            all.push(o.speciesCode);
          });
          return ensureTaxonomy(all, key).then(function () {
            res.forEach(function (r) {
              r.rows.forEach(function (o) {
                var c = speciesOf(o.speciesCode);
                if (c && !S.have[c]) (present[c] = present[c] || {})[r.rc] = 1;
              });
            });
            notable.forEach(function (o) {
              var rc = o.subnational2Code;
              if (!regions[rc]) return;
              note(o, rc, true);
              var c = speciesOf(o.speciesCode);
              if (c) covered[c + "|" + rc] = 1;
            });
          });
        });
      })
      .then(function () {
        var tasks = [];
        Object.keys(present).forEach(function (c) {
          Object.keys(present[c]).forEach(function (rc) {
            if (covered[c + "|" + rc]) return;
            tasks.push(function () {
              return liveGet("/data/obs/" + rc + "/recent/" + c + "?back=2&detail=full", key).then(function (rows) {
                rows.forEach(function (o) {
                  note(o, rc, false);
                });
              });
            });
          });
        });
        return pool(tasks, 3, function (d, n) {
          btn.textContent = "refreshing " + d + "/" + n + "…";
        });
      })
      .then(function () {
        mergeLive(fresh);
        S.liveAt = new Date().toISOString();
        apply();
      })
      .catch(function (e) {
        if (e.message === "key") {
          storeSet(KEY_STORE, null);
          $("needs-keyrow").hidden = false;
          $("needs-keymsg").textContent = "eBird rejected that key. Enter it again.";
        } else {
          $("needs-updated").textContent = "live refresh failed (" + e.message + "); showing the snapshot";
        }
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "refresh now";
      });
  }

  function mergeLive(fresh) {
    var idx = {};
    S.obs.forEach(function (o) {
      idx[o.sp + "|" + o.sub + "|" + o.loc] = o;
    });
    fresh.forEach(function (f) {
      var o = f.o;
      var k = f.code + "|" + o.subId + "|" + o.locId;
      var rec = idx[k];
      if (!rec) {
        rec = idx[k] = { sp: f.code, sub: o.subId, loc: o.locId };
        S.obs.push(rec);
      }
      rec.dt = o.obsDt;
      rec.n = o.howMany;
      rec.valid = o.obsValid;
      rec.notable = rec.notable || f.notable;
      if (!S.snap.locations[o.locId])
        S.snap.locations[o.locId] = { name: o.locName, lat: o.lat, lng: o.lng, county: S.snap.regions[f.rc], private: !!o.locationPrivate };
      var s = S.snap.species[f.code];
      if (!s) {
        var t = S.snap.taxonomy[f.code] || {};
        s = S.snap.species[f.code] = { en: t.en || o.comName, sci: t.sci, family: t.family, taxonOrder: t.taxonOrder, rare: false };
      }
      if (f.notable) s.rare = true;
    });
  }

  /* ---------- init ---------- */

  function wire() {
    document.querySelectorAll("#needs-window button").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll("#needs-window button").forEach(function (x) {
          x.setAttribute("aria-pressed", String(x === b));
        });
        apply();
      });
    });
    ["needs-county", "needs-rare", "needs-search", "needs-sort"].forEach(function (id) {
      $(id).addEventListener("input", apply);
      $(id).addEventListener("change", apply);
    });
    $("needs-refresh").addEventListener("click", refreshNow);
    $("needs-keysave").addEventListener("click", function () {
      var v = $("needs-key").value.trim();
      if (!v) return;
      storeSet(KEY_STORE, v);
      $("needs-key").value = "";
      $("needs-keyrow").hidden = true;
      $("needs-keymsg").textContent = "";
      refreshNow();
    });
    $("needs-keyforget").addEventListener("click", function () {
      storeSet(KEY_STORE, null);
      $("needs-keyrow").hidden = true;
    });

    Object.keys(S.snap.regions)
      .map(function (k) {
        return S.snap.regions[k];
      })
      .sort()
      .forEach(function (name) {
        var o = document.createElement("option");
        o.value = o.textContent = name;
        $("needs-county").appendChild(o);
      });
  }

  Promise.all([
    fetch(SNAPSHOT, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("needs.json " + r.status);
      return r.json();
    }),
    // The gallery's own data: anything photographed since the snapshot drops off now.
    fetch(BASE + "/data.json")
      .then(function (r) {
        return r.ok ? r.json() : { species: [] };
      })
      .catch(function () {
        return { species: [] };
      }),
  ])
    .then(function (res) {
      S.snap = res[0];
      S.obs = S.snap.obs;
      res[1].species.forEach(function (s) {
        S.have[s.code] = 1;
      });
      wire();
      apply();
    })
    .catch(function (err) {
      console.error(err);
      $("needs-stats").textContent = "Could not load the sightings snapshot.";
    });
})();
