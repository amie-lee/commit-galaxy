# 🌌 commit-galaxy

Visualizes your GitHub contribution history as a pixel art galaxy.  
No server needed — GitHub Actions regenerates the SVG every day automatically.

![galaxy](./galaxy.svg)

---

## How it works

Every day at midnight (UTC), a GitHub Actions workflow fetches your contribution data via the GitHub GraphQL API and generates a self-contained SVG with pixel art stars. The more commits you make on a given day, the brighter and larger the star.

| Commits | Star |
|---------|------|
| 0 | dim dot (1×1) |
| 1 | small square (2×2) |
| 2–4 | cross (3×3) |
| 5–9 | diamond (5×5) |
| 10+ | glowing star (7×7) |

---

## Setup

### 1. Fork this repo

Click the **Fork** button at the top right to copy it to your account.

### 2. Rename the repo (optional)

To embed the SVG directly in your GitHub profile, rename the repo to `<your-username>` so it becomes `<username>/<username>`.

### 3. Allow Actions to write

Go to `Settings → Actions → General → Workflow permissions`  
and select **Read and write permissions**, then save.

### 4. Run for the first time

Go to `Actions → Generate Galaxy SVG → Run workflow`.  
This creates `galaxy.svg` immediately. After that, it runs automatically every day.

### 5. Add to your profile README

```markdown
[![My Galaxy](https://raw.githubusercontent.com/<username>/commit-galaxy/main/galaxy.svg)](https://github.com/amie-lee/commit-galaxy)
```

If the repo is named `<username>/<username>`, you can use a relative path:

```markdown
[![My Galaxy](./galaxy.svg)](https://github.com/amie-lee/commit-galaxy)
```

---

## Local development

```bash
export GITHUB_USERNAME=your-username
export GITHUB_TOKEN=ghp_xxxx   # PAT with read:user scope

node scripts/generate.js

open galaxy.svg   # macOS
```

---

## Customization

Edit the constants at the top of `scripts/generate.js`:

```js
const W                = 860;   // canvas width
const H                = 350;   // canvas height
const STAR_AREA_BOTTOM = 190;   // y boundary for stars (above the earth)
```

To change the background image, replace `bg.png` (860×350 px PNG) and adjust `STAR_AREA_BOTTOM` to match the horizon line of your new image.

---

## Credits

**Background image**  
Earth from space photographed by NASA <br>
Source: [Unsplash](https://unsplash.com/ko/%EC%82%AC%EC%A7%84/%EC%9A%B0%EC%A3%BC-%EA%B3%B5%EA%B0%84-%EC%82%AC%EC%A7%84-Q1p7bh3SHj8)

**Pixel font**  
[Mona Font](https://github.com/MonadABXY/mona-font) by [Monad ABXY](https://monadabxy.com)  
Licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/).

---

## License

MIT