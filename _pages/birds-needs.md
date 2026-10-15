---
layout: page
permalink: /birds/needs/
title: birds I still need
description: Recent eBird reports around the Bay Area of species I have not photographed yet.
nav: false
_styles: >
  #needs-app { margin-top: 1rem; }

  .needs-stats { font-size: 0.95rem; margin-bottom: 0.15rem; }
  .needs-updated {
    color: var(--global-text-color-light);
    font-size: 0.8rem;
    margin-bottom: 0.9rem;
  }

  .needs-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.9rem;
  }
  .needs-controls input[type="search"] { flex: 1 1 12rem; min-width: 0; }
  .needs-controls input[type="search"], .needs-controls select, #needs-key {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--global-divider-color);
    border-radius: 6px;
    background: var(--global-bg-color);
    color: var(--global-text-color);
    font-size: 0.9rem;
    font-family: inherit;
  }
  .needs-check { font-size: 0.9rem; display: flex; gap: 0.3rem; align-items: center; margin: 0; }

  .needs-btn, .needs-seg button, #needs-detail button {
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--global-divider-color);
    background: var(--global-bg-color);
    color: var(--global-text-color);
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
    border-radius: 6px;
  }
  .needs-btn:disabled { opacity: 0.6; cursor: progress; }
  .needs-seg { display: flex; flex-wrap: wrap; }
  .needs-seg button { border-radius: 0; margin-left: -1px; }
  .needs-seg button:first-child { border-radius: 6px 0 0 6px; margin-left: 0; }
  .needs-seg button:last-child { border-radius: 0 6px 6px 0; }
  .needs-seg button[aria-pressed="true"] {
    background: var(--global-theme-color);
    border-color: var(--global-theme-color);
    color: #fff;
    position: relative;
  }

  #needs-keyrow {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.85rem;
    margin-bottom: 0.9rem;
    color: var(--global-text-color-light);
  }
  #needs-keyrow[hidden] { display: none; }
  #needs-key { flex: 1 1 12rem; min-width: 0; }

  #needs-map {
    height: 62vh;
    min-height: 340px;
    border-radius: 8px;
    border: 1px solid var(--global-divider-color);
    z-index: 0;
  }
  .needs-legend {
    font-size: 0.78rem;
    color: var(--global-text-color-light);
    margin: 0.4rem 0 1rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .needs-legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 0.3rem;
    vertical-align: -1px;
  }

  .rare {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #fff;
    background: #e8590c;
    border-radius: 4px;
    padding: 0 0.3rem;
    line-height: 1.5;
    vertical-align: 1px;
  }

  #needs-detail {
    border: 1px solid var(--global-divider-color);
    border-radius: 8px;
    padding: 0.8rem 1rem;
    margin-bottom: 1rem;
    background: var(--global-card-bg-color);
  }
  #needs-detail .hd {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  #needs-detail .hd span { flex: 1 1 auto; }
  #needs-detail ul, .needs-pop ul { list-style: none; padding: 0; margin: 0; }
  #needs-detail li { padding: 0.5rem 0; border-top: 1px solid var(--global-divider-color); }
  #needs-detail .ttl { font-weight: 600; font-size: 0.9rem; }
  #needs-detail .rep { font-size: 0.85rem; margin-top: 0.15rem; }
  .where { font-weight: 400; font-size: 0.78rem; color: var(--global-text-color-light); }
  .cm {
    font-size: 0.8rem;
    color: var(--global-text-color-light);
    font-style: italic;
    margin: 0.1rem 0 0.2rem;
    overflow-wrap: anywhere;
  }

  .needs-pop .ttl { font-weight: 600; }
  .needs-pop .where { margin-bottom: 0.4rem; }
  .needs-pop li { padding: 0.3rem 0; border-top: 1px solid #ddd; font-size: 0.82rem; }

  .needs-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 0.5rem;
  }
  .needs-sp {
    text-align: left;
    border: 1px solid var(--global-divider-color);
    border-radius: 8px;
    background: var(--global-card-bg-color);
    color: var(--global-text-color);
    padding: 0.5rem 0.7rem;
    cursor: pointer;
    font-family: inherit;
    display: block;
    width: 100%;
  }
  .needs-sp.on { border-color: var(--global-theme-color); box-shadow: 0 0 0 1px var(--global-theme-color); }
  .needs-sp .nm { font-weight: 600; font-size: 0.88rem; margin-right: 0.35rem; }
  .needs-sp .sub { display: block; font-size: 0.75rem; color: var(--global-text-color-light); margin-top: 0.15rem; }

  .needs-empty { padding: 1.5rem 0; color: var(--global-text-color-light); text-align: center; }

  @media (max-width: 576px) {
    #needs-map { height: 52vh; }
    .needs-list { grid-template-columns: 1fr; }
  }
---

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
