# yankeesong.github.io

Personal website — [yankeesong.github.io](https://yankeesong.github.io/)

Built with [Jekyll](https://jekyllrb.com/), based on the
[al-folio](https://github.com/alshedivat/al-folio) theme. Deployed to GitHub
Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Working with images

Camera originals do not belong in this repo. `jekyll-imagemagick` generates the
480/800/1400 webp variants that browsers actually load; the committed source
file is only ever the `<img>` fallback, so anything much larger than 1600px is
dead weight that also slows the CI build.

After adding photos under `assets/img/`, run:

```bash
bin/optimize-images.sh --dry-run   # preview
bin/optimize-images.sh             # resize anything over 1600px, in place
```

Keep full-resolution originals somewhere outside the repo.

Reference images from posts with lowercase extensions:

```liquid
{% include figure.liquid path="assets/img/posts/2026/travel/photo_1.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
```

The extension in the path must match the file on disk exactly. GitHub Pages is
case-sensitive and `figure.liquid` passes the path straight through to the
fallback `src`, so a `.JPG` file referenced as `.jpg` yields a silent 404.

## Formatting

Prettier formatting is enforced in CI. Install the git hooks once:

```bash
pip install pre-commit
pre-commit install
```

Or format manually before committing:

```bash
npx prettier . --write
```

## Local development

```bash
bundle install
bundle exec jekyll serve
```

Requires Ruby (see `Gemfile`) and ImageMagick for responsive image generation.
