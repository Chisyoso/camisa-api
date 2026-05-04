const express = require("express");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

const WIDTH = 1152;
const HEIGHT = 648;

const VS_URL = "https://i.imgur.com/DOys6I4.png";

async function getUserId(username) {
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
    });
    const data = await res.json();
    return data.data?.[0]?.id || null;
  } catch {
    return null;
  }
}

async function getAvatarFromUsername(username) {
  const id = await getUserId(username);
  if (!id) return null;
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png&isCircular=false`
    );
    const data = await res.json();
    return data.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

function safe(v) {
  return decodeURIComponent(v || "");
}

async function loadImageSafe(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const buffer = await res.buffer();
    return await loadImage(buffer);
  } catch {
    return null;
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

async function drawBackground(ctx, bgUrl) {
  if (bgUrl && bgUrl !== "0" && bgUrl !== "?") {
    const img = await loadImageSafe(bgUrl);
    if (img) {
      ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }
  }
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, "#050505");
  bg.addColorStop(0.55, "#0b0b0b");
  bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 50, WIDTH / 2, HEIGHT / 2, WIDTH / 1.6);
  glow.addColorStop(0, "rgba(255,255,255,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

async function drawPlayer(ctx, username, x, y) {
  const avatarURL = await getAvatarFromUsername(username);
  const avatar = avatarURL ? await loadImageSafe(avatarURL) : null;
  const palette = paletteFromSeed(username);

  const boxW = 360;
  const boxH = 440;
  const boxX = x - boxW / 2;
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
    const size = 360;
    ctx.drawImage(avatar, x - size / 2, y - size / 2, size, size);
  }

  drawCenteredText(ctx, username, x, 540, 320, 40, "white", "rgba(0,0,0,0.9)", 8);
}

async function drawVS(ctx) {
  const vs = await loadImageSafe(VS_URL);
  if (vs) {
    ctx.save();
    ctx.shadowColor = "rgba(255,0,0,0.45)";
    ctx.shadowBlur = 28;
    ctx.drawImage(vs, WIDTH / 2 - 110, HEIGHT / 2 - 110, 220, 220);
    ctx.restore();
  }
}

app.get("/versus", async (req, res) => {
  try {
    const leftNick = safe(req.query.leftNick) || "Player1";
    const rightNick = safe(req.query.rightNick) || "Player2";

    const leftName = safe(req.query.leftName) || leftNick;
    const rightName = safe(req.query.rightName) || rightNick;

    const score = safe(req.query.score) || "0-0";
    const bgUrl = safe(req.query.font);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    await drawBackground(ctx, bgUrl);

    const topGlow = ctx.createRadialGradient(WIDTH / 2, 80, 20, WIDTH / 2, 80, 260);
    topGlow.addColorStop(0, "rgba(255,255,255,0.18)");
    topGlow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawCenteredText(ctx, score, WIDTH / 2, 86, 320, 104, "white", "rgba(0,0,0,0.95)", 10);

    await drawPlayer(ctx, leftNick, 250, 320);
    await drawPlayer(ctx, rightNick, WIDTH - 250, 320);

    await drawVS(ctx);

    const leftPalette = paletteFromSeed(leftName);
    const rightPalette = paletteFromSeed(rightName);

    drawCenteredText(ctx, leftName, 250, 610, 360, 42, leftPalette.text, "rgba(0,0,0,0.95)", 9);
    drawCenteredText(ctx, rightName, WIDTH - 250, 610, 360, 42, rightPalette.text, "rgba(0,0,0,0.95)", 9);

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    res.set("Content-Type", "image/png");
    res.send(canvas.toBuffer());
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.listen(PORT, () => console.log("VS ROBLOX PRO 🔥"));