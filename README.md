# Sai Hitesh Bommagani — portfolio site

The published version of my portfolio, served by GitHub Pages. Source and development history live in [sai-hitesh-portfolio](https://github.com/saihitesh-14/sai-hitesh-portfolio); copy changes from there into this repository's root to publish them.

## Publishing

`.github/workflows/static.yml` deploys the repository root to GitHub Pages on every push to `main`. Pages must use **GitHub Actions** as its source (Settings → Pages → Build and deployment).

`sai_hitesh_portfolio.html` redirects to the homepage, so links to the previous single-page portfolio keep working.

## Run locally

From this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open http://127.0.0.1:4173. JavaScript modules need this local server rather than opening `index.html` directly. There are no installs or build steps.
