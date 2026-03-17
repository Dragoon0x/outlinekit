# Publish & Deploy

```bash
gh repo create useoutlinekit --public --description "X-ray vision for your website's design DNA"
git init && git add . && git commit -m "v1.0.0 — useoutlinekit"
git branch -M main
git remote add origin https://github.com/dragoon0x/useoutlinekit.git
git push -u origin main
npm login && npm publish --access public
```

Enable Pages: Settings → Pages → Source → GitHub Actions
