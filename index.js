import chokidar from "chokidar";
import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { homedir } from "os";
import trash from "trash";

// ES Module fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PICTURES_DIR = path.join(homedir(), "Pictures");
const LOG_FILE = path.join(__dirname, "processing-log.json");

// Load existing log
async function loadLog() {
  try {
    const data = await fs.readFile(LOG_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save to log
async function logEvent(event) {
  try {
    const log = await loadLog();
    log.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
    await fs.writeFile(LOG_FILE, JSON.stringify(log, null, 2));
  } catch (error) {
    console.error("Error writing to log:", error);
  }
}

// Function to process AVIF to JPEG
async function convertAvifToJpeg(filepath) {
  const jpegPath = filepath.replace(".avif", ".jpg");
  try {
    await sharp(filepath).jpeg({ quality: 10 }).toFile(jpegPath);
    await fs.unlink(filepath);
    console.log(`Converted AVIF to JPEG: ${jpegPath}`);
    await logEvent({
      type: "converted",
      from: path.basename(filepath),
      to: path.basename(jpegPath),
    });
    return jpegPath;
  } catch (error) {
    console.error(`Error converting AVIF to JPEG: ${filepath}`, error);
    throw error;
  }
}

// Function to make image square with white background
async function makeSquare(filepath) {
  try {
    const image = sharp(filepath);
    const metadata = await image.metadata();
    const maxDimension = Math.max(metadata.width, metadata.height);
    const pngPath = filepath.replace(/\.(jpg|jpeg|gif|bmp|webp)$/i, ".png");

    await image
      .ensureAlpha() // Ensure alpha channel is handled
      .toColourspace("srgb") // Force RGB color space
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Flatten with white background, preserving color
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png({ compressionLevel: 0 })
      .toFile(pngPath);

    console.log(`Processed image: ${pngPath}. Please check the result.`);
    await logEvent({
      type: "processed",
      originalFile: path.basename(filepath),
      newFile: path.basename(pngPath),
      dimensions: `${maxDimension}x${maxDimension}`,
    });
    // Comment out trash until confirmed:
    await trash(filepath);
  } catch (error) {
    console.error(`Error processing image: ${filepath}`, error);
    await logEvent({
      type: "error",
      file: path.basename(filepath),
      error: error.message,
    });
    throw error;
  }
}

// Main process function
async function processImage(filepath) {
  try {
    // Check if file matches our extensions
    if (!/\.(jpg|jpeg|gif|bmp|webp|avif)$/i.test(filepath)) {
      return;
    }

    // Handle AVIF files
    if (filepath.endsWith(".avif")) {
      filepath = await convertAvifToJpeg(filepath);
    }

    // Make square and convert to PNG
    await makeSquare(filepath);
  } catch (error) {
    console.error(`Error processing ${filepath}:`, error);
    await logEvent({
      type: "error",
      file: path.basename(filepath),
      error: error.message,
    });
  }
}

// Watch for new files
const watcher = chokidar.watch(PICTURES_DIR, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 10,
  },
});

watcher.on("add", processImage);

console.log(`Watching ${PICTURES_DIR} for new images...`);

// Log service start
(async () => {
  await logEvent({
    type: "service",
    action: "started",
  });
})();

// Handle process termination
process.on("SIGINT", async () => {
  console.log("Stopping image watcher...");
  await logEvent({
    type: "service",
    action: "stopped",
  });
  watcher.close().then(() => process.exit(0));
});
