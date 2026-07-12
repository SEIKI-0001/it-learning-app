import { copyFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const downloadDir = "/Users/seikikobayashi/Downloads";
const sourcePaths = {
  baseMap: path.join(downloadDir, "ChatGPT Image 2026年7月12日 23_58_13.png"),
  fog: path.join(downloadDir, "ChatGPT Image 2026年7月12日 23_58_23.png"),
  landmarksZip: path.join(downloadDir, "it-learning-map-landmarks.zip"),
};
const landmarkNames = [
  "village",
  "hill",
  "forest",
  "plains",
  "swamp",
  "canyon",
  "gate",
  "castle",
];

function isOuterBackground(r, g, b) {
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  return maximum > 238 && maximum - minimum < 14;
}

/**
 * Removes only neutral bright pixels reachable from a canvas edge. This keeps
 * enclosed white wave foam and highlights while removing the baked-in checkerboard.
 */
export function clearOuterBackground(data, width, height) {
  const output = new Uint8Array(data);
  const seen = new Uint8Array(width * height);
  const queue = [];

  const enqueue = (x, y) => {
    const position = y * width + x;
    if (seen[position]) return;
    const index = position * 4;
    if (!isOuterBackground(output[index], output[index + 1], output[index + 2])) return;
    seen[position] = 1;
    queue.push(position);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const position = queue[head];
    const x = position % width;
    const y = Math.floor(position / width);
    output[position * 4 + 3] = 0;
    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }

  return output;
}

async function writeAlphaWebp(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = clearOuterBackground(data, info.width, info.height);
  await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(outputPath);
}

export async function processRoadmapMapAssets(projectRoot = process.cwd()) {
  const outputRoot = path.join(projectRoot, "public", "maps", "roadmap");
  const landmarkOutput = path.join(outputRoot, "landmarks");
  const effectsOutput = path.join(outputRoot, "effects");
  const extractedRoot = path.join(os.tmpdir(), "it-learning-map-landmarks");

  await Promise.all([mkdir(landmarkOutput, { recursive: true }), mkdir(effectsOutput, { recursive: true })]);
  await execFileAsync("unzip", ["-oq", sourcePaths.landmarksZip, "-d", os.tmpdir()]);
  await Promise.all([
    writeAlphaWebp(sourcePaths.baseMap, path.join(outputRoot, "base-map.webp")),
    writeAlphaWebp(sourcePaths.fog, path.join(effectsOutput, "fog.webp")),
    ...landmarkNames.map((name) =>
      copyFile(
        path.join(extractedRoot, "runtime-webp", `${name}.webp`),
        path.join(landmarkOutput, `${name}.webp`),
      ),
    ),
  ]);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  processRoadmapMapAssets().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
