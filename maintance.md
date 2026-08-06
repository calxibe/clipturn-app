# Website maintenance

## Stylesheet URLs

Keep stylesheet references free of version query strings. Pages should link to `site.css` directly, using `/site.css` only where a root-relative URL is required, such as `404.html`.

Do not append cache-busting values such as `?v=20260806-18`. The site is deployed through GitHub Pages, and the current Cloudflare configuration does not cache these static files, so this project does not use query-string cache busting.
