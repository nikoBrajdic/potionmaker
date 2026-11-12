// Read a bank tab from its grid. A stack is named only when its sprite matches
// one the user has already confirmed. Everything else stays unnamed, with the
// cut-out sprite shown so it can be mapped once.

export async function readBankShot(file, catalog, memory = []) {
  void catalog;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, width, height);
  const known = memory.map(decodeMemory).filter(Boolean);
  const background = backgroundColor(image);
  const cells = findCells(image);
  const rows = [];
  let skipped = 0;
  for (const cell of cells) {
    const sprite = cutSprite(image, cell, background);
    if (!sprite) {
      skipped += 1;
      continue;
    }
    const match = matchMemory(sprite, known);
    const count = readCount(image, cell);
    rows.push({
      id: `${file.name}-${cell.x}-${cell.y}`,
      key: match ? match.key : "",
      name: match ? match.name : "",
      src: match ? match.src : "",
      preview: previewURL(sprite.pixels, sprite.w, sprite.h),
      signature: pack(sprite.pixels),
      w: sprite.w,
      h: sprite.h,
      count: count.value,
      assumed: count.assumed,
      ambiguous: !match,
      options: [],
      pick: "",
    });
  }
  return { name: file.name || "Pasted screenshot", rows, skipped };
}

function decodeMemory(entry) {
  const pixels = unpack(entry.signature);
  if (!pixels || !entry.w || !entry.h || pixels.length !== entry.w * entry.h * 4) return null;
  return { ...entry, pixels, ink: opaqueCount(pixels) };
}

function findCells(image) {
  const { width, height, data } = image;
  const yellow = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    if (countYellow(data, i * 4)) yellow[i] = 1;
  }
  const dil = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!yellow[y * width + x]) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -2; dx <= 2; dx += 1) {
          const xx = x + dx;
          if (xx >= 0 && xx < width) dil[yy * width + xx] = 1;
        }
      }
    }
  }
  const seen = new Uint8Array(width * height);
  const raw = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (seen[start] || !dil[start]) continue;
      const box = flood(dil, seen, width, height, x, y);
      if (box.area >= 24 && box.area <= 650 && box.maxX - box.minX >= 8 && box.maxY - box.minY >= 6) {
        raw.push(box);
      }
    }
  }
  raw.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  const bands = [];
  for (const box of raw) {
    if (!bands.length || box.minY - bands[bands.length - 1][0].minY > 16) bands.push([box]);
    else bands[bands.length - 1].push(box);
  }
  const merged = bands.map((band) => {
    const groups = [];
    for (const box of band.slice().sort((a, b) => a.minX - b.minX)) {
      const last = groups[groups.length - 1];
      if (last && box.minX - last.minX <= 18) {
        last.minX = Math.min(last.minX, box.minX);
        last.minY = Math.min(last.minY, box.minY);
        last.maxX = Math.max(last.maxX, box.maxX);
        last.maxY = Math.max(last.maxY, box.maxY);
      } else groups.push({ ...box });
    }
    return groups;
  });
  const dense = merged.filter((row) => row.length >= 4);
  const gaps = [];
  for (const row of dense) {
    for (let i = 1; i < row.length; i += 1) {
      const gap = row[i].minX - row[i - 1].minX;
      if (gap >= 40 && gap <= 110) gaps.push(gap);
    }
  }
  for (let i = 1; i < dense.length; i += 1) {
    const gap = dense[i][0].minY - dense[i - 1][0].minY;
    if (gap >= 40 && gap <= 110) gaps.push(gap);
  }
  if (!gaps.length) return [];
  gaps.sort((a, b) => a - b);
  const pitch = gaps[gaps.length >> 1];
  const longest = dense.reduce((best, row) => (row.length > best.length ? row : best));
  const col0 = Math.min(...longest.map((box) => box.minX));
  const row0 = Math.min(...dense.map((row) => row[0].minY));
  const cells = new Map();
  for (const row of merged) {
    for (const box of row) {
      const col = Math.round((box.minX - col0) / pitch);
      const line = Math.round((box.minY - row0) / pitch);
      const x = col0 + col * pitch;
      const y = row0 + line * pitch;
      if (col < 0 || line < 0 || Math.abs(box.minX - x) > 14 || Math.abs(box.minY - y) > 14) continue;
      cells.set(`${col},${line}`, { x, y, w: pitch, h: pitch });
    }
  }
  return [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

function flood(mask, seen, width, height, x0, y0) {
  const stack = [x0, y0];
  const box = { minX: x0, maxX: x0, minY: y0, maxY: y0, area: 0 };
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const index = y * width + x;
    if (seen[index] || !mask[index]) continue;
    seen[index] = 1;
    box.area += 1;
    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y);
    box.maxY = Math.max(box.maxY, y);
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  return box;
}

function cutSprite(image, cell, background) {
  const x0 = Math.max(0, cell.x - 2);
  const y0 = cell.y + 16;
  const x1 = Math.min(image.width, cell.x + cell.w - 2);
  const y1 = Math.min(image.height, cell.y + cell.h - 2);
  if (x1 - x0 < 8 || y1 - y0 < 8) return null;
  const spanW = x1 - x0;
  const spanH = y1 - y0;
  let minX = spanW;
  let minY = spanH;
  let maxX = -1;
  let maxY = -1;
  const ink = [];
  for (let y = 0; y < spanH; y += 1) {
    for (let x = 0; x < spanW; x += 1) {
      const offset = ((y0 + y) * image.width + x0 + x) * 4;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      if (Math.abs(r - background[0]) + Math.abs(g - background[1]) + Math.abs(b - background[2]) <= 26) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      ink.push(x, y, r, g, b);
    }
  }
  if (ink.length < 150 || maxX < 0) return null;
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < ink.length; i += 5) {
    const x = ink[i] - minX;
    const y = ink[i + 1] - minY;
    const to = (y * w + x) * 4;
    pixels[to] = ink[i + 2];
    pixels[to + 1] = ink[i + 3];
    pixels[to + 2] = ink[i + 4];
    pixels[to + 3] = 255;
  }
  return { pixels, w, h, ink: opaqueCount(pixels) };
}

function matchMemory(sprite, known) {
  let best = null;
  let second = 0;
  for (const entry of known) {
    if (Math.abs(entry.w - sprite.w) > 8 || Math.abs(entry.h - sprite.h) > 8) continue;
    const ratio = entry.ink / sprite.ink;
    if (ratio < 0.65 || ratio > 1.55) continue;
    const score = spriteScore(sprite.pixels, sprite.w, sprite.h, entry.pixels, entry.w, entry.h);
    if (!best || score > best.score) {
      second = best ? best.score : second;
      best = { ...entry, score };
    } else if (score > second) second = score;
  }
  if (!best || best.score < 0.9 || best.score - second < 0.12) return null;
  return best;
}

function spriteScore(a, aw, ah, b, bw, bh) {
  let best = 0;
  for (let dy = -3; dy <= 3; dy += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      let count = 0;
      let error = 0;
      for (let y = 0; y < ah; y += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= bh) continue;
        for (let x = 0; x < aw; x += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= bw) continue;
          const ia = (y * aw + x) * 4;
          const ib = (yy * bw + xx) * 4;
          const aOn = a[ia + 3] >= 128;
          const bOn = b[ib + 3] >= 128;
          if (!aOn && !bOn) continue;
          count += 1;
          error += (a[ia] - b[ib]) ** 2 + (a[ia + 1] - b[ib + 1]) ** 2 + (a[ia + 2] - b[ib + 2]) ** 2;
        }
      }
      if (count >= 20) best = Math.max(best, 1 / (1 + error / count / 900));
      if (best > 0.985) return best;
    }
  }
  return best;
}

function opaqueCount(pixels) {
  let count = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] >= 128) count += 1;
  return count;
}

function countYellow(data, offset) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  return r > 185 && g > 155 && b < 90 && r + g > b * 4;
}

function backgroundColor(image) {
  const { data, width, height } = image;
  const samples = [];
  const step = Math.max(1, Math.floor(width / 80));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.22 && max > 20 && max < 90) samples.push(r + g + b, r, g, b);
    }
  }
  if (!samples.length) return [51, 46, 41];
  const triples = [];
  for (let i = 0; i < samples.length; i += 4) triples.push(samples.slice(i, i + 4));
  triples.sort((a, b) => a[0] - b[0]);
  const mid = triples[triples.length >> 1];
  return [mid[1], mid[2], mid[3]];
}

function previewURL(pixels, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(w, h);
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function pack(pixels) {
  let text = "";
  const chunk = 0x8000;
  for (let i = 0; i < pixels.length; i += chunk) {
    text += String.fromCharCode(...pixels.subarray(i, i + chunk));
  }
  return btoa(text);
}

function unpack(signature) {
  if (!signature) return null;
  try {
    const text = atob(signature);
    const pixels = new Uint8ClampedArray(text.length);
    for (let i = 0; i < text.length; i += 1) pixels[i] = text.charCodeAt(i);
    return pixels;
  } catch {
    return null;
  }
}

const COUNT_DIGITS = [
  ["0",7,[0,5,0,6,0,7,0,8,0,9,0,10,1,4,2,4,2,12,3,2,3,3,3,13,4,4,4,12,5,4,5,11,6,5,6,6,6,7,6,8,6,9,6,10]],
  ["0",6,[0,4,0,11,0,12,1,3,1,13,2,3,2,13,3,4,3,11,3,12,4,5,4,6,4,7,4,8,4,9,4,10,5,6,5,7,5,8,5,9,5,10]],
  ["0",6,[0,4,0,11,1,4,1,12,2,2,2,3,2,13,3,4,3,12,4,4,4,11,5,5,5,6,5,7,5,8,5,9,5,10]],
  ["1",4,[0,3,0,4,0,5,0,12,0,13,1,2,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,1,11,1,12,1,13,2,13,3,13]],
  ["1",6,[0,3,0,4,0,5,0,12,0,13,1,2,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,1,11,1,12,1,13,2,13,3,13,5,6,5,7,5,8,5,9,5,10]],
  ["1",7,[0,4,0,13,1,4,1,13,2,2,2,3,2,4,2,5,2,6,2,7,2,8,2,9,2,10,2,11,2,12,2,13,3,12,3,13,4,13,6,4,6,5,6,9,6,10,6,11]],
  ["1",4,[0,4,0,13,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,1,12,1,13,2,2,2,3,2,4,2,5,2,6,2,7,2,8,2,9,2,10,2,11,2,12,2,13,3,13]],
  ["2",7,[0,4,0,12,0,13,1,12,1,13,2,2,2,3,2,10,2,13,3,2,3,3,3,8,3,9,3,13,4,2,4,3,4,7,4,13,5,7,5,13,6,4,6,5,6,6,6,13]],
  ["2",8,[0,4,0,12,0,13,1,4,1,11,1,12,1,13,2,2,2,3,2,10,2,13,3,2,3,3,3,13,4,2,4,3,4,13,5,2,5,3,5,7,5,13,6,4,6,5,6,13,7,4,7,5,7,13]],
  ["3",6,[0,4,1,4,1,12,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,2,4,3,4,7,4,13,5,4,5,5,5,6,5,8,5,9,5,10,5,11,5,12]],
  ["3",6,[0,4,0,11,0,12,1,7,1,13,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,4,4,5,4,9,4,10,4,11,5,4,5,5,5,9,5,10,5,11]],
  ["3",6,[0,4,1,4,1,11,1,12,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,2,4,3,4,7,4,13,5,4,5,5,5,6,5,8,5,9,5,10,5,11,5,12]],
  ["4",6,[0,3,0,4,0,5,0,6,0,7,0,8,0,9,0,10,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,2,10,3,7,3,8,3,9,3,10,3,11,3,12,3,13,4,7,4,8,4,9,4,10,4,11,4,12,4,13,5,10]],
  ["4",6,[0,3,0,4,0,5,0,6,0,7,0,8,0,9,0,10,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,2,10,3,7,3,8,3,9,3,10,3,11,3,12,3,13,4,7,4,8,4,9,4,10,4,11,4,12,4,13,5,10]],
  ["4",6,[0,3,0,4,0,5,0,6,0,7,0,8,0,9,0,10,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,2,10,3,7,3,8,3,9,3,10,3,11,3,12,3,13,4,7,4,8,4,9,4,10,4,11,4,12,4,13,5,10]],
  ["5",6,[0,2,0,3,0,4,0,5,0,6,0,7,0,11,0,12,1,2,1,3,1,7,1,13,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,2,4,3,4,9,4,10,4,11,4,12,5,9,5,10,5,11]],
  ["5",6,[0,3,0,4,0,5,0,6,0,7,1,2,1,3,1,4,1,5,1,6,1,7,1,12,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,2,4,3,4,7,4,13,5,2,5,3,5,8,5,9,5,10,5,11,5,12]],
  ["5",6,[0,3,0,4,0,5,0,6,0,7,0,11,0,12,1,2,1,3,1,4,1,5,1,6,1,7,1,12,1,13,2,2,2,3,2,7,2,12,2,13,3,2,3,3,3,7,3,13,4,2,4,3,4,7,4,13,5,2,5,3,5,8,5,9,5,10,5,11,5,12]],
  ["6",6,[0,4,0,8,0,9,0,13,1,4,1,8,1,13,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,7,4,13,5,4,5,8,5,9,5,10,5,11,5,12]],
  ["6",8,[0,6,0,7,0,8,0,9,0,10,0,11,1,5,1,6,1,7,1,8,1,9,1,10,1,11,1,12,2,4,2,8,2,9,2,13,3,3,3,13,4,2,4,3,4,7,4,13,5,2,5,3,5,7,5,13,6,9,6,10,6,11,6,12,7,4,7,9,7,10,7,11]],
  ["6",8,[0,6,0,7,0,8,0,9,0,10,0,11,1,5,1,6,1,7,1,8,1,9,1,10,1,11,1,12,2,4,2,8,2,9,2,13,3,3,3,7,3,13,4,2,4,3,4,7,4,13,5,2,5,3,5,7,5,13,6,4,6,9,6,10,6,11,6,12,7,4,7,9,7,10,7,11]],
  ["7",6,[0,2,0,3,0,11,0,12,0,13,1,2,1,3,1,9,1,10,2,2,2,3,2,9,2,10,3,2,3,3,3,5,3,6,3,7,4,2,4,3,4,4,5,3,5,4]],
  ["7",6,[0,12,0,13,1,2,1,3,1,11,1,12,1,13,2,2,2,3,2,8,2,9,2,10,3,2,3,3,3,6,3,7,4,2,4,3,4,5,4,6,4,7,5,2,5,3,5,4]],
  ["7",6,[0,12,0,13,1,2,1,3,1,11,1,12,1,13,2,2,2,3,2,8,2,9,2,10,3,2,3,3,3,6,3,7,4,2,4,3,4,5,4,6,4,7,5,2,5,3,5,4]],
  ["8",8,[0,4,0,5,0,9,0,10,0,11,1,4,1,5,1,6,1,8,1,9,1,10,1,11,1,12,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,2,4,3,4,7,4,13,5,2,5,3,5,7,5,13,6,5,6,6,6,9,6,10,6,11,6,12,7,4,7,5,7,9,7,10,7,11]],
  ["8",6,[0,2,0,3,0,7,0,13,1,2,1,3,1,7,1,13,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,5,4,6,4,10,4,11,5,4,5,5,5,9,5,10,5,11]],
  ["8",8,[0,4,0,5,0,9,0,10,0,11,1,4,1,5,1,6,1,8,1,9,1,10,1,11,1,12,2,2,2,3,2,7,2,13,3,2,3,3,3,7,3,13,4,2,4,3,4,7,4,13,5,2,5,3,5,7,5,13,6,5,6,6,6,9,6,10,6,11,6,12,7,4,7,5,7,9,7,10,7,11]],
  ["9",7,[0,4,0,5,0,6,1,2,1,3,1,7,2,2,2,3,2,8,3,2,3,3,3,8,3,9,4,2,4,3,4,8,4,9,5,5,5,6,5,7,5,8,5,9,5,11,5,12,5,13,6,4,6,5,6,6,6,7,6,8,6,9,6,10,6,11,6,12,6,13]],
  ["9",8,[0,4,0,5,1,4,1,5,1,6,2,2,2,3,2,7,3,2,3,3,3,8,4,2,4,3,4,8,4,9,5,2,5,3,5,8,5,9,6,5,6,6,6,7,6,8,6,9,6,11,6,12,6,13,7,4,7,5,7,6,7,7,7,8,7,9,7,10,7,11,7,12,7,13]],
  ["9",8,[0,4,0,5,1,4,1,5,1,6,2,2,2,3,2,7,3,2,3,3,3,8,4,2,4,3,4,8,4,9,5,2,5,3,5,8,5,9,6,6,6,7,6,8,6,9,6,11,7,4,7,5,7,6,7,7,7,8,7,9,7,10,7,11,7,12,7,13]]
];

const COUNT_TEMPLATES = COUNT_DIGITS.map(([ch, width, flat]) => {
  const box = new Uint8Array(width * 16);
  let height = 0;
  for (let i = 0; i < flat.length; i += 2) {
    const x = flat[i];
    const y = flat[i + 1];
    box[y * width + x] = 1;
    if (y + 1 > height) height = y + 1;
  }
  return { ch, width, ink: flat.length / 2, box, height };
});

function stackInk(r, g, b) {
  return r > 155 && g > 145 && Math.abs(r - g) < 40 && b < 45 && r + g > b * 6;
}

function readCount(image, cell) {
  // Templates were cut from the 150% client, where a slot is about 66px.
  // A different scale is left for the user rather than guessed.
  if (cell.w < 60 || cell.w > 72) return { value: 1, assumed: true };
  const bw = 42;
  const bh = 14;
  if (cell.x < 0 || cell.y < 0 || cell.x + bw > image.width || cell.y + bh > image.height) {
    return { value: 1, assumed: true };
  }
  const mask = new Uint8Array(bw * bh);
  const { data, width } = image;
  for (let y = 0; y < bh; y += 1) {
    for (let x = 0; x < bw; x += 1) {
      const offset = ((cell.y + y) * width + cell.x + x) * 4;
      if (stackInk(data[offset], data[offset + 1], data[offset + 2])) mask[y * bw + x] = 1;
    }
  }
  const slots = [];
  for (let xx = 0; xx < bw; xx += 1) {
    let best = null;
    let second = -1;
    for (const digit of COUNT_TEMPLATES) {
      if (xx + digit.width > bw) continue;
      for (let dy = -4; dy <= 2; dy += 1) {
        let hits = 0;
        let extra = 0;
        for (let py = 0; py < digit.height; py += 1) {
          const yy = py + dy;
          if (yy < 0 || yy >= bh) continue;
          const row = yy * bw + xx;
          for (let px = 0; px < digit.width + 2; px += 1) {
            if (xx + px >= bw) break;
            const on = mask[row + px];
            if (px < digit.width && digit.box[py * digit.width + px]) hits += on;
            else if (on) extra += 1;
          }
        }
        const score = (hits - extra) / digit.ink;
        if (!best || score > best.score) {
          if (best && best.ch !== digit.ch) second = Math.max(second, best.score);
          best = { score, ch: digit.ch, width: digit.width };
        } else if (digit.ch !== best.ch) {
          second = Math.max(second, score);
        }
      }
    }
    if (best) slots.push({ score: best.score, second, ch: best.ch, width: best.width, x: xx });
  }
  const chosen = [];
  let xx = 0;
  while (xx < bw) {
    let pick = null;
    for (const slot of slots) {
      if (slot.x < xx || slot.x >= xx + 3) continue;
      if (slot.score < 0.5 || (slot.score < 0.72 && slot.score - slot.second < 0.06)) continue;
      if (
        !pick
        || slot.score > pick.score
        || (slot.score === pick.score && (
          slot.second > pick.second
          || (slot.second === pick.second && (slot.ch > pick.ch || (slot.ch === pick.ch && (slot.width > pick.width || (slot.width === pick.width && slot.x > pick.x)))))
        ))
      ) pick = slot;
    }
    if (!pick) {
      xx += 1;
      continue;
    }
    chosen.push(pick);
    let end = pick.x + 2;
    let empty = 0;
    for (let col = pick.x + 2; col < Math.min(bw, pick.x + 12); col += 1) {
      let ink = 0;
      for (let y = 0; y < bh; y += 1) ink += mask[y * bw + col];
      if (ink) {
        end = col + 1;
        empty = 0;
      } else {
        empty += 1;
        if (empty >= 2) break;
      }
    }
    xx = Math.min(end, pick.x + Math.max(4, pick.width - 1));
  }
  if (!chosen.length) return { value: 1, assumed: true };
  chosen.sort((a, b) => a.x - b.x);
  let total = 0;
  for (let i = 0; i < mask.length; i += 1) total += mask[i];
  const span = new Uint8Array(bw);
  for (const pick of chosen) {
    for (let col = pick.x; col < Math.min(bw, pick.x + pick.width); col += 1) span[col] = 1;
  }
  let stray = 0;
  for (let col = 0; col < bw; col += 1) {
    if (span[col]) continue;
    if ((col > 0 && span[col - 1]) || (col + 1 < bw && span[col + 1])) continue;
    for (let y = 0; y < bh; y += 1) stray += mask[y * bw + col];
  }
  if (total && stray / total > 0.18) return { value: 1, assumed: true };
  const text = chosen.map((pick) => pick.ch).join("");
  if (!/^\d{1,6}$/.test(text)) return { value: 1, assumed: true };
  return { value: Number(text), assumed: false };
}

