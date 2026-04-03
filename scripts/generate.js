// scripts/generate.js
// GitHub contribution 데이터를 받아서 우주 성운 SVG를 생성합니다.
// bg.png와 Mona12 폰트를 base64로 embed해서 완전한 self-contained SVG를 만듭니다.

const fs   = require("fs");
const path = require("path");

const USERNAME = process.env.GITHUB_USERNAME;
const TOKEN    = process.env.GITHUB_TOKEN;

// ── 캔버스 & 별 영역 설정 ────────────────────────────────────────────────────
const W                = 860;
const H                = 350;
const STAR_AREA_BOTTOM = 190; // 별이 배치되는 y 최대값 (px)

// ── 0. Mona12 woff2 준비 (없으면 CDN에서 자동 다운로드) ─────────────────────

const FONT_PATH = path.join(__dirname, "..", "mona12.woff2");
const FONT_URL  =
  "https://cdn.jsdelivr.net/gh/MonadABXY/mona-font/web/Mona12-Regular.woff2";

async function ensureFont() {
  if (fs.existsSync(FONT_PATH)) {
    console.log("  → mona12.woff2 already exists, skipping download");
    return;
  }
  console.log("  → Downloading Mona12 font...");
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`Font download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(FONT_PATH, buf);
  console.log(`  → mona12.woff2 saved (${(buf.length / 1024).toFixed(1)} KB)`);
}

// ── 1. GitHub GraphQL API에서 contribution 데이터 가져오기 ──────────────────

async function fetchContributions(username) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                weekday
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: username } }),
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);

  const calendar =
    json.data.user.contributionsCollection.contributionCalendar;

  const days = calendar.weeks.flatMap((w) => w.contributionDays);
  const firstDayOfWeek = days.length > 0 ? days[0].weekday : 0;

  return {
    days,
    total: calendar.totalContributions,
    firstDayOfWeek,
  };
}

// ── 2. 픽셀 별 SVG rect 문자열 생성 ─────────────────────────────────────────

function pixelStar(cx, cy, count, index) {
  const s1 = ((index * 9301 + 49297) % 233280) / 233280;

  // 2px 그리드에 스냅
  const px = Math.round(cx / 2) * 2;
  const py = Math.round(cy / 2) * 2;

  const r = (x, y, w, h, fill, op) =>
    op !== undefined && op < 1
      ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" opacity="${op.toFixed(2)}"/>`
      : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

  // count = 0: 1×1 dim dot
  if (count === 0) {
    return r(px, py, 2, 2, "#3A4A5C", 0.15 + s1 * 0.2);
  }

  // count = 1: 2×2 small square
  if (count === 1) {
    return (
      r(px,   py,   2, 2, "#98A8C8") +
      r(px+2, py,   2, 2, "#98A8C8") +
      r(px,   py+2, 2, 2, "#98A8C8") +
      r(px+2, py+2, 2, 2, "#98A8C8")
    );
  }

  // count = 2~4: 3×3 cross
  if (count <= 4) {
    const c = "#BCC8E8";
    return (
      r(px,   py-2, 2, 2, c) +   // top
      r(px-2, py,   6, 2, c) +   // middle
      r(px,   py+2, 2, 2, c)     // bottom
    );
  }

  // count = 5~9: 5×5 diamond
  if (count <= 9) {
    const c = "#E8EEFF";
    return (
      r(px,   py-4, 2,  2, c) +  // top tip
      r(px-2, py-2, 6,  2, c) +  // row 2
      r(px-4, py,   10, 2, c) +  // middle (widest)
      r(px-2, py+2, 6,  2, c) +  // row 4
      r(px,   py+4, 2,  2, c)    // bottom tip
    );
  }

  // count = 10+: 7×7 pixel star
  const w = "#FFFFFF", y = "#FFEEAA";
  return (
    r(px,   py-6, 2,  2, w, 0.3) +                              // top glow
    r(px,   py-4, 2,  2, w) +                                   // top point
    r(px-2, py-2, 2,  2, y) + r(px, py-2, 2, 2, w) + r(px+2, py-2, 2, 2, y) +
    r(px-6, py,   14, 2, w) +                                   // middle bar
    r(px-2, py+2, 2,  2, y) + r(px, py+2, 2, 2, w) + r(px+2, py+2, 2, 2, y) +
    r(px,   py+4, 2,  2, w) +                                   // bottom point
    r(px,   py+6, 2,  2, w, 0.3) +                              // bottom glow
    r(px-8, py,   2,  2, w, 0.2) +                              // left glow
    r(px+8, py,   2,  2, w, 0.2)                                // right glow
  );
}

// ── 3. SVG 생성 ─────────────────────────────────────────────────────────────

function generateSVG(days, total, username, firstDayOfWeek) {
  const PAD_X      = 20;
  const PAD_TOP    = 28;
  const PAD_BOTTOM = 14;
  const cellW = (W - PAD_X * 2) / 53;
  const cellH = (STAR_AREA_BOTTOM - PAD_TOP - PAD_BOTTOM) / 7;

  // bg.png → base64 embed (GitHub SVG 렌더링에서 외부 href 차단 우회)
  const bgData   = fs.readFileSync(path.join(__dirname, "..", "bg.png")).toString("base64");
  const bgImage  = `<image href="data:image/png;base64,${bgData}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" style="image-rendering: pixelated;"/>`;

  // Mona12 woff2 → base64 embed
  const fontData = fs.readFileSync(FONT_PATH).toString("base64");
  const fontFace = `@font-face {
      font-family: 'Mona12';
      src: url('data:font/woff2;base64,${fontData}') format('woff2');
      font-weight: normal;
      font-style: normal;
    }`;

  // 별 요소 생성
  let starElements = "";

  days.forEach((day, i) => {
    // GitHub과 동일한 요일 고정 그리드
    const gridIndex = firstDayOfWeek + i;
    const col = Math.floor(gridIndex / 7);
    const row = gridIndex % 7;

    // 셀 중심 → 2px 그리드 스냅
    const cx = Math.round((PAD_X + col * cellW + cellW / 2) / 2) * 2;
    const cy = Math.round((PAD_TOP + row * cellH + cellH / 2) / 2) * 2;

    // 시드 기반 jitter (2px 단위 스냅으로 픽셀 느낌 유지)
    const seed    = (col * 7 + row) * 9301 + 49297;
    const jitter  = Math.round(((seed % 233280) / 233280 - 0.5) * 3) * 2;
    const jitterY = Math.round((((seed * 13) % 233280) / 233280 - 0.5) * 3) * 2;

    const x = cx + jitter;
    const y = cy + jitterY;

    // 가장 큰 별(7×7) 기준 마진 8px
    if (y < PAD_TOP + 8 || y > STAR_AREA_BOTTOM - PAD_BOTTOM - 8) return;
    if (x < 8 || x > W - 8) return;

    starElements += pixelStar(x, y, day.contributionCount, i);
  });

  // 레이블: Mona12 12px (픽셀 또렷한 권장 크기)
  const label = `<text x="${PAD_X}" y="18"
    font-family="'Mona12', monospace"
    font-size="12"
    fill="#8899CC"
    opacity="0.85"
    style="image-rendering: pixelated;"
  >${username}'s galaxy · ${total.toLocaleString()} contributions</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>${fontFace}</style>
  </defs>

  <!-- background (bg.png base64 embed) -->
  ${bgImage}

  <!-- contribution stars (요일 고정 그리드, 픽셀 아트) -->
  ${starElements}

  <!-- label (Mona12 픽셀 폰트) -->
  ${label}
</svg>`;
}

// ── 4. 메인 실행 ─────────────────────────────────────────────────────────────

async function main() {
  if (!USERNAME) throw new Error("GITHUB_USERNAME is not set");
  if (!TOKEN)    throw new Error("GITHUB_TOKEN is not set");

  // Mona12 폰트 준비
  await ensureFont();

  console.log(`Fetching contributions for @${USERNAME}...`);
  const { days, total, firstDayOfWeek } = await fetchContributions(USERNAME);
  console.log(`  → ${days.length} days, ${total} total contributions`);
  console.log(`  → year starts on weekday ${firstDayOfWeek} (0=Sun)`);

  console.log("Generating SVG...");
  const svg = generateSVG(days, total, USERNAME, firstDayOfWeek);

  fs.writeFileSync("galaxy.svg", svg, "utf8");
  console.log("  → galaxy.svg saved ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});