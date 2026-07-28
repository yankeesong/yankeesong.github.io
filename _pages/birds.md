---
layout: page
permalink: /birds/
title: birds
description: Every bird I have photographed, on a map and searchable by species, family and place.
nav: true
nav_order: 3
_styles: >
  #birds-app { margin-top: 1rem; }

  .birds-stats {
    color: var(--global-text-color-light);
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .birds-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }
  .birds-controls input[type="search"] {
    flex: 1 1 14rem;
    min-width: 0;
  }
  .birds-controls input, .birds-controls select {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--global-divider-color);
    border-radius: 6px;
    background: var(--global-bg-color);
    color: var(--global-text-color);
    font-size: 0.9rem;
    font-family: inherit;
  }
  .birds-controls select { max-width: 100%; }
  .birds-toggle { display: flex; gap: 0; }
  .birds-toggle button {
    padding: 0.4rem 0.9rem;
    border: 1px solid var(--global-divider-color);
    background: var(--global-bg-color);
    color: var(--global-text-color);
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
  }
  .birds-toggle button:first-child { border-radius: 6px 0 0 6px; }
  .birds-toggle button:last-child { border-radius: 0 6px 6px 0; border-left: none; }
  .birds-toggle button[aria-pressed="true"] {
    background: var(--global-theme-color);
    border-color: var(--global-theme-color);
    color: #fff;
  }

  #birds-map {
    height: 65vh;
    min-height: 340px;
    border-radius: 8px;
    border: 1px solid var(--global-divider-color);
    z-index: 0;
  }

  .birds-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.9rem;
  }
  .bird-card {
    border: 1px solid var(--global-divider-color);
    border-radius: 8px;
    overflow: hidden;
    background: var(--global-card-bg-color);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    transition: transform 0.12s ease;
  }
  .bird-card:hover { transform: translateY(-2px); }
  .bird-card .thumb {
    aspect-ratio: 4 / 3;
    background-size: cover;
    background-position: center;
    background-color: var(--global-code-bg-color);
  }
  .bird-card .meta { padding: 0.5rem 0.6rem 0.6rem; }
  .bird-card .en { font-weight: 600; font-size: 0.85rem; line-height: 1.25; }
  .bird-card .zh { font-size: 0.85rem; color: var(--global-text-color-light); }
  .bird-card .sub {
    font-size: 0.72rem;
    color: var(--global-text-color-light);
    margin-top: 0.25rem;
  }
  .bird-card .count {
    font-size: 0.68rem;
    color: var(--global-theme-color);
    margin-top: 0.15rem;
  }

  .birds-empty {
    padding: 2rem 0;
    color: var(--global-text-color-light);
    text-align: center;
  }

  .bird-marker {
    background: var(--global-theme-color);
    color: #fff;
    border: 2px solid #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  }
  .bird-marker.approximate { opacity: 0.75; border-style: dashed; }

  #birds-lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.92);
    z-index: 10000;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  #birds-lightbox.open { display: flex; }
  #birds-lightbox img {
    max-width: 100%;
    max-height: 78vh;
    object-fit: contain;
    border-radius: 4px;
  }
  #birds-lightbox .lb-meta {
    color: #eee;
    text-align: center;
    margin-top: 0.8rem;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  #birds-lightbox .lb-meta .lb-title { font-size: 1.05rem; font-weight: 600; }
  #birds-lightbox .lb-meta .lb-sci { font-style: italic; opacity: 0.75; }
  #birds-lightbox button {
    position: absolute;
    background: rgba(255,255,255,0.12);
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    font-size: 1.4rem;
    cursor: pointer;
    line-height: 1;
  }
  #birds-lightbox .lb-close { top: 1rem; right: 1rem; }
  #birds-lightbox .lb-prev { left: 1rem; top: 50%; transform: translateY(-50%); }
  #birds-lightbox .lb-next { right: 1rem; top: 50%; transform: translateY(-50%); }

  @media (max-width: 576px) {
    .birds-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
    #birds-map { height: 55vh; }
  }
---

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""
/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

<div id="birds-app">
  <div class="birds-stats" id="birds-stats">loading…</div>

  <div class="birds-controls">
    <div class="birds-toggle">
      <button id="birds-view-gallery" aria-pressed="true">gallery</button>
      <button id="birds-view-map" aria-pressed="false">map</button>
    </div>
    <input type="search" id="birds-search" placeholder="search species, Chinese name, or genus…" />
    <select id="birds-family"><option value="">all families</option></select>
    <select id="birds-location"><option value="">all locations</option></select>
    <select id="birds-sort">
      <option value="taxonomic">taxonomic order</option>
      <option value="recent">most recent</option>
      <option value="alpha">A–Z</option>
    </select>
  </div>

  <div id="birds-gallery"><div class="birds-grid" id="birds-grid"></div>
    <div class="birds-empty" id="birds-empty" hidden>Nothing matches those filters.</div>
  </div>
  <div id="birds-map" hidden></div>
</div>

<div id="birds-lightbox" aria-hidden="true">
  <button class="lb-close" aria-label="Close">&times;</button>
  <button class="lb-prev" aria-label="Previous">&lsaquo;</button>
  <button class="lb-next" aria-label="Next">&rsaquo;</button>
  <img id="birds-lightbox-img" alt="" />
  <div class="lb-meta" id="birds-lightbox-meta"></div>
</div>

<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
  crossorigin=""
></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script src="{{ '/assets/birds/app.js' | relative_url }}"></script>
