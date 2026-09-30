// Faces of the guys. A photo (cropped to the face, normalized x, y, w, h) or a drawn placeholder.
// To add someone's face: drop a photo into src/assets/faces/ and add it here.
import kirill from '../assets/faces/kirill.png?inline';

const PHOTOS = {
  kirill: { src: kirill, crop: [0.16, 0.0, 0.74, 0.8] },
};

const cache = {};

function loadPhoto(id) {
  const p = PHOTOS[id];
  if (!p) return null;
  if (!cache[id]) {
    cache[id] = { img: new Image(), ready: false, waiters: [] };
    cache[id].img.onload = () => {
      cache[id].ready = true;
      cache[id].waiters.forEach((fn) => fn());
    };
    cache[id].img.src = p.src;
  }
  return cache[id];
}

// Draws the face into ctx at (x, y, w, h). Calls onReady again when a photo finishes loading.
export function drawFace(ctx, id, { skin, hair }, x, y, w, h, onReady) {
  const photo = loadPhoto(id);
  const draw = () => {
    if (photo?.ready) {
      const [cx, cy, cw, ch] = PHOTOS[id].crop;
      const { naturalWidth: iw, naturalHeight: ih } = photo.img;
      ctx.clearRect(x, y, w, h);
      ctx.drawImage(photo.img, cx * iw, cy * ih, cw * iw, ch * ih, x, y, w, h);
      // cut-out photo: fill the see-through / whitish background with the hair colour
      const [hr, hg, hb] = [1, 3, 5].map((i) => parseInt(hair.slice(i, i + 2), 16));
      const px = ctx.getImageData(x, y, w, h);
      for (let i = 0; i < px.data.length; i += 4) {
        const d = px.data;
        const a = d[i + 3] / 255;
        const whitish = d[i] > 215 && d[i + 1] > 215 && d[i + 2] > 215;
        const t = whitish ? 1 : 1 - a; // blend semi-transparent edges into the hair colour
        d[i] = d[i] * (1 - t) + hr * t;
        d[i + 1] = d[i + 1] * (1 - t) + hg * t;
        d[i + 2] = d[i + 2] * (1 - t) + hb * t;
        d[i + 3] = 255;
      }
      ctx.putImageData(px, x, y);
      return;
    }
    // placeholder: skin, hair fringe, eyes, brows, mouth
    const u = w / 16, v = h / 16;
    ctx.fillStyle = skin;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hair;
    ctx.fillRect(x, y, w, v * 4);
    ctx.fillRect(x, y, u * 2, v * 7);
    ctx.fillRect(x + w - u * 2, y, u * 2, v * 7);
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x + u * 4, y + v * 6, u * 2, v * 2);
    ctx.fillRect(x + u * 10, y + v * 6, u * 2, v * 2);
    ctx.fillRect(x + u * 3, y + v * 5, u * 4, v * 0.8);
    ctx.fillRect(x + u * 9, y + v * 5, u * 4, v * 0.8);
    ctx.fillStyle = '#b86a5a';
    ctx.fillRect(x + u * 5, y + v * 11.5, u * 6, v * 1.2);
  };
  draw();
  if (photo && !photo.ready) photo.waiters.push(() => (draw(), onReady?.()));
}
