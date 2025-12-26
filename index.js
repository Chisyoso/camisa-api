const express = require('express');
const { createCanvas, loadImage } = require('canvas');

const app = express();

app.get('/camisa', async (req, res) => {
  try {
    const { img, nombre, numero } = req.query;

    if (!img || !nombre || !numero) {
      return res.status(400).send('Faltan datos: img, nombre, numero');
    }

    const base = await loadImage(img);
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');

    // Dibujar imagen de fondo
    ctx.drawImage(base, 0, 0);

    // Nombre arriba
    ctx.font = `bold ${base.width / 8}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(nombre.toUpperCase(), base.width / 2, base.height * 0.2);

    // Número grande abajo
    ctx.font = `bold ${base.width / 2.5}px Arial`;
    ctx.fillText(numero, base.width / 2, base.height * 0.65);

    res.setHeader('Content-Type', 'image/png');
    res.send(canvas.toBuffer());

  } catch (error) {
    console.error(error);
    res.status(500).send('Error generando imagen');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API lista en http://localhost:${port}`));
