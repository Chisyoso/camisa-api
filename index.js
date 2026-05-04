const express = require("express");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

const WIDTH = 1152;
const HEIGHT = 648;

const VS_URL = "https://i.imgur.com/DOys6I4.png";
const DEFAULT_AVATAR = "https://i.imgur.com/4jduEyb.png";

function safeDecode(v) {
  if (v === undefined || v === null) return "";
  try {
    return decodeURIComponent(String(v));
  } catch {
    return String(v);
  }
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function paletteFromSeed(seed) {
  const h = hashString(seed || "?");
  const hue1 = h % 360;
  const hue2 = (hue1 + 35 + (h % 40)) % 360;
  return {
    fill: `hsla(${hue1}, 85%, 60%, 0.20)`,
    stroke: `hsla(${hue1}, 90%, 70%, 0.55)`,
    text: `hsla(${hue2}, 100%, 96%, 0.98)`,
    glow: `hsla(${hue1}, 90%, 65%, 0.28)`,
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function loadImageSafe(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const buffer = await res.buffer();
    return await loadImage(buffer);
  } catch {
    return null;
  }
}

function fitFontSize(ctx, text, maxWidth, startSize, weight = "bold", family = "Sans") {
  let size = startSize;
  while (size > 8) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }
  return size;
}

function drawCenteredText(ctx, text, x, y, maxWidth, startSize, fillStyle, strokeStyle, lineWidth, weight = "bold") {
  const size = fitFontSize(ctx, text, maxWidth, startSize, weight);
  ctx.font = `${weight} ${size}px Sans`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.fillStyle = fillStyle;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

function drawContainImage(ctx, img, centerX, centerY, boxW, boxH) {
  const scale = Math.min(boxW / img.width, boxH / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = centerX - dw / 2;
  const dy = centerY - dh / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawBackground(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#050505");
  bg.addColorStop(0.55, "#0b0b0b");
  bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w / 1.6);
  glow.addColorStop(0, "rgba(255,255,255,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

async function drawSide(ctx, side, cfg) {
  const avatar = await loadImageSafe(cfg.avatar || DEFAULT_AVATAR);
  const palette = paletteFromSeed(`${cfg.nick}|${cfg.name}|${cfg.avatar}`);

  const boxW = 360;
  const boxH = 440;
  const boxX = cfg.x - boxW / 2;
  const boxY = 90;

  ctx.save();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 32;

  roundedRect(ctx, boxX, boxY, boxW, boxH, 28);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();
  ctx.restore();

  if (avatar) {
    const imgW = side === "left" ? 320 : 320;
    const imgH = 360;
    drawContainImage(ctx, avatar, cfg.x, cfg.y, imgW, imgH);
  }

  const nickText = cfg.nick || "?";
  const nameText = cfg.name || "?";

  const nickY = 525;
  const nameY = 580;

  drawCenteredText(
    ctx,
    nickText,
    cfg.x,
    nickY,
    320,
    34,
    "white",
    "rgba(0,0,0,0.85)",
    7,
    "bold"
  );

  const nameGradient = ctx.createLinearGradient(cfg.x - 150, 0, cfg.x + 150, 0);
  nameGradient.addColorStop(0, palette.text);
  nameGradient.addColorStop(1, palette.stroke);

  drawCenteredText(
    ctx,
    nameText,
    cfg.x,
    nameY,
    360,
    42,
    nameGradient,
    "rgba(0,0,0,0.90)",
    8,
    "bold"
  );
}

async function drawVsBadge(ctx) {
  const vs = await loadImageSafe(VS_URL);
  if (vs) {
    const w = 220;
    const h = 220;
    const x = WIDTH / 2 - w / 2;
    const y = HEIGHT / 2 - h / 2 - 10;
    ctx.save();
    ctx.shadowColor = "rgba(255,0,0,0.45)";
    ctx.shadowBlur = 28;
    ctx.drawImage(vs, x, y, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = "white";
    ctx.font = "bold 140px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", WIDTH / 2, HEIGHT / 2 - 10);
  }
}

app.get("/versus", async (req, res) => {
  try {
    const leftAvatar = safeDecode(req.query.leftAvatar) || DEFAULT_AVATAR;
    const rightAvatar = safeDecode(req.query.rightAvatar) || DEFAULT_AVATAR;

    const leftNick = safeDecode(req.query.leftNick) || "?";
    const rightNick = safeDecode(req.query.rightNick) || "?";

    const leftName = safeDecode(req.query.leftName) || leftNick;
    const rightName = safeDecode(req.query.rightName) || rightNick;

    const score = safeDecode(req.query.score) || "3-0";

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    drawBackground(ctx, WIDTH, HEIGHT);

    const topGlow = ctx.createRadialGradient(WIDTH / 2, 80, 20, WIDTH / 2, 80, 260);
    topGlow.addColorStop(0, "rgba(255,255,255,0.18)");
    topGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 16;
    drawCenteredText(ctx, score, WIDTH / 2, 86, 320, 104, "white", "rgba(0,0,0,0.95)", 10, "bold");
    ctx.shadowBlur = 0;

    await drawSide(ctx, "left", {
      x: 245,
      y: 320,
      avatar: leftAvatar,
      nick: leftNick,
      name: leftName,
    });

    await drawSide(ctx, "right", {
      x: WIDTH - 245,
      y: 320,
      avatar: rightAvatar,
      nick: rightNick,
      name: rightName,
    });

    await drawVsBadge(ctx);

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    res.set("Content-Type", "image/png");
    res.send(canvas.toBuffer("image/png"));
  } catch (err) {
    console.log(err);
    res.status(500).send("Error generando imagen");
  }
});

app.listen(PORT, () => console.log("VS API lista 🔥"));