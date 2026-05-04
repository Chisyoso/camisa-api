const express = require("express");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

const WIDTH = 1152;
const HEIGHT = 648;

const VS_URL = "https://i.imgur.com/DOys6I4.png";

// =========================
// ROBLOX API
// =========================
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

// =========================
// UTIL
// =========================
function safe(v) {
  return decodeURIComponent(v || "");
}

async function loadImageSafe(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.buffer();
    return await loadImage(buffer);
  } catch {
    return null;
  }
}

// =========================
// DRAW
// =========================
function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, "#000");
  grad.addColorStop(1, "#111");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawText(ctx, text, x, y, size) {
  ctx.font = `bold ${size}px Sans`;
  ctx.textAlign = "center";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "black";
  ctx.fillStyle = "white";
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

async function drawPlayer(ctx, username, x, y) {
  const avatarURL = await getAvatarFromUsername(username);
  const avatar = avatarURL ? await loadImageSafe(avatarURL) : null;

  if (avatar) {
    const size = 360;
    ctx.drawImage(avatar, x - size / 2, y - size / 2, size, size);
  }

  drawText(ctx, username, x, y + 260, 40);
}

async function drawVS(ctx) {
  const vs = await loadImageSafe(VS_URL);
  if (vs) {
    ctx.drawImage(vs, WIDTH / 2 - 110, HEIGHT / 2 - 110, 220, 220);
  }
}

// =========================
// API
// =========================
app.get("/versus", async (req, res) => {
  try {
    const leftNick = safe(req.query.leftNick) || "Player1";
    const rightNick = safe(req.query.rightNick) || "Player2";

    const leftName = safe(req.query.leftName) || leftNick;
    const rightName = safe(req.query.rightName) || rightNick;

    const score = safe(req.query.score) || "0-0";

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    drawBackground(ctx);

    // score
    drawText(ctx, score, WIDTH / 2, 90, 100);

    // players (RENDERS AUTOMÁTICOS)
    await drawPlayer(ctx, leftNick, 250, 320);
    await drawPlayer(ctx, rightNick, WIDTH - 250, 320);

    // VS
    await drawVS(ctx);

    // team names abajo
    drawText(ctx, leftName, 250, 600, 45);
    drawText(ctx, rightName, WIDTH - 250, 600, 45);

    res.set("Content-Type", "image/png");
    res.send(canvas.toBuffer());
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

app.listen(PORT, () => console.log("VS ROBLOX API 🔥"));