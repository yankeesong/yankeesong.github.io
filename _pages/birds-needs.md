---
layout: page
permalink: /birds/needs/
title: birds I still need
description: Recent eBird reports around the Bay Area of species I have not photographed yet.
nav: false
---

<link rel="stylesheet" href="{{ '/assets/birds/needs.css' | relative_url }}" />
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""
/>

<div id="needs-app">
  <div class="needs-stats" id="needs-stats">loading…</div>
  <div class="needs-updated">
    Alameda, San Francisco, San Mateo and Santa Clara · <span id="needs-updated"></span> ·
    <a href="{{ '/birds/' | relative_url }}">photographed so far</a>
  </div>

  <div class="needs-controls">
    <div class="needs-seg" id="needs-window" role="group" aria-label="Reported within">
      <button type="button" data-days="1" aria-pressed="false">today</button>
      <button type="button" data-days="2" aria-pressed="true">since yesterday</button>
      <button type="button" data-days="3" aria-pressed="false">3 days</button>
      <button type="button" data-days="7" aria-pressed="false">week</button>
      <button type="button" data-days="14" aria-pressed="false">2 weeks</button>
      <button type="button" data-days="30" aria-pressed="false">month</button>
    </div>
    <button type="button" class="needs-btn" id="needs-refresh" title="Pull the last two days live from eBird with your own key">refresh now</button>
  </div>

  <div id="needs-keyrow" hidden>
    <span id="needs-keymsg">Live refresh uses your eBird API key, saved in this browser only.</span>
    <input type="password" id="needs-key" placeholder="eBird API key" autocomplete="off" />
    <button type="button" class="needs-btn" id="needs-keysave">save &amp; refresh</button>
    <button type="button" class="needs-btn" id="needs-keyforget">cancel</button>
  </div>

  <div class="needs-controls">
    <input type="search" id="needs-search" placeholder="search species or family…" />
    <select id="needs-county"><option value="">all four counties</option></select>
    <select id="needs-sort">
      <option value="taxonomic">taxonomic order</option>
      <option value="recent">most recent</option>
      <option value="spots">most locations</option>
    </select>
    <label class="needs-check"><input type="checkbox" id="needs-rare" /> rarities only</label>
  </div>

  <div id="needs-map"></div>
  <div class="needs-legend">
    <span><i style="background: var(--global-theme-color)"></i>needed species reported here (bigger = more)</span>
    <span><i style="background: #e8590c"></i>includes a rarity</span>
  </div>

  <div id="needs-detail" hidden></div>
  <div class="needs-list" id="needs-list"></div>
  <div class="needs-empty" id="needs-empty" hidden>Nothing I still need was reported in this window.</div>
</div>

<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
  crossorigin=""
></script>
<script src="{{ '/assets/birds/needs.js' | relative_url }}"></script>
