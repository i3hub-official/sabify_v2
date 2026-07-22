// scripts/download-models.js
// Downloads @vladmandic/human model files from multiple sources
// Uses GitHub raw and jsDelivr CDN as fallbacks
//
// Usage:  node scripts/download-models.js
// Add to package.json:  "postinstall": "node scripts/download-models.js"

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.join(__dirname, '..', 'static', 'models', 'human');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log(`📁 Created: ${modelsDir}`);
}

// ── Model sources ──────────────────────────────────────────────────────────────
const SOURCES = {
  GITHUB: 'https://raw.githubusercontent.com/vladmandic/human-models/main/models',
  JSDELIVR: 'https://cdn.jsdelivr.net/npm/@vladmandic/human-models/models',
  UNPKG: 'https://unpkg.com/@vladmandic/human-models/models'
};

// ── All available models from @vladmandic/human-models ─────────────────────────
const MODEL_FILES = [
  // Face detection & recognition (core)
  { file: 'blazeface.json', required: true },
  { file: 'blazeface.bin', required: true },
  { file: 'facemesh.json', required: true },
  { file: 'facemesh.bin', required: true },
  { file: 'iris.json', required: true },
  { file: 'iris.bin', required: true },
  { file: 'faceres.json', required: true },
  { file: 'faceres.bin', required: true },
  
  // Face landmarks (alternative)
  { file: 'face-landmarks.json', required: false },
  { file: 'face-landmarks.bin', required: false },
  
  // Emotion detection
  { file: 'emotion.json', required: false },
  { file: 'emotion.bin', required: false },
  
  // Hand detection
  { file: 'handtrack.json', required: false },
  { file: 'handtrack.bin', required: false },
  { file: 'handlandmark-lite.json', required: false },
  { file: 'handlandmark-lite.bin', required: false },
  { file: 'hand-landmarks.json', required: false },
  { file: 'hand-landmarks.bin', required: false },
  
  // Body/Pose detection
  { file: 'movenet-lightning.json', required: false },
  { file: 'movenet-lightning.bin', required: false },
  { file: 'posenet.json', required: false },
  { file: 'posenet.bin', required: false },
  
  // Object detection
  { file: 'yolo.json', required: false },
  { file: 'yolo.bin', required: false },
  { file: 'ssd-mobilenet.json', required: false },
  { file: 'ssd-mobilenet.bin', required: false },
  
  // Segmentation
  { file: 'selfie-segmentation.json', required: false },
  { file: 'selfie-segmentation.bin', required: false },
  
  // Antispoof
  { file: 'antispoof.json', required: false },
  { file: 'antispoof.bin', required: false },
  
  // Gesture
  { file: 'gesture.json', required: false },
  { file: 'gesture.bin', required: false },
  
  // Additional model files that might be referenced
  { file: 'face-detector.json', required: false },
  { file: 'face-detector.bin', required: false },
  { file: 'face-recognizer.json', required: false },
  { file: 'face-recognizer.bin', required: false }
];

// ── Download file with multiple source fallbacks ──────────────────────────────
async function downloadWithFallback(file, sources) {
  for (const sourceName of sources) {
    const sourceUrl = SOURCES[sourceName];
    const url = `${sourceUrl}/${file}`;
    const dest = path.join(modelsDir, file);
    
    try {
      process.stdout.write(`   Trying ${sourceName}... `);
      await download(url, dest);
      const stats = fs.statSync(dest);
      if (stats.size > 0) {
        console.log(`✅ (${(stats.size / 1024).toFixed(0)} KB)`);
        return true;
      }
    } catch (err) {
      console.log(`❌`);
      // Clean up failed download
      try { fs.unlinkSync(dest); } catch {}
    }
  }
  return false;
}

// ── Downloader with retries and timeout ───────────────────────────────────────
function download(url, dest, retries = 2) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const lib = url.startsWith('https') ? https : http;
    
    const timeout = setTimeout(() => {
      file.close();
      try { fs.unlinkSync(dest); } catch {}
      reject(new Error(`Timeout downloading ${url}`));
    }, 30000); // 30 second timeout

    const req = lib.get(url, { 
      headers: { 'User-Agent': 'mouau-etest-model-downloader/1.0' },
      timeout: 30000
    }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        clearTimeout(timeout);
        if (retries > 0) {
          return download(res.headers.location, dest, retries - 1).then(resolve).catch(reject);
        }
        return reject(new Error(`Too many redirects for ${url}`));
      }

      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        clearTimeout(timeout);
        if (retries > 0) {
          return download(url, dest, retries - 1).then(resolve).catch(reject);
        }
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      res.pipe(file);
      file.on('finish', () => {
        clearTimeout(timeout);
        file.close();
        resolve();
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      file.close();
      try { fs.unlinkSync(dest); } catch {}
      if (retries > 0) {
        setTimeout(() => {
          download(url, dest, retries - 1).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(err);
      }
    });
  });
}

// ── Create placeholder for missing files ──────────────────────────────────────
function createPlaceholder(file) {
  const dest = path.join(modelsDir, file);
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, JSON.stringify({ placeholder: true, note: "Model not available from sources" }));
    console.log(`   📝 Created placeholder: ${file}`);
    return true;
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Downloading @vladmandic/human models for face recognition…');
  console.log('📦 This may take a few minutes...\n');

  let success = 0;
  let failed = 0;
  let placeholders = 0;

  for (const { file, required } of MODEL_FILES) {
    const dest = path.join(modelsDir, file);
    
    // Skip if already exists and has content
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
      console.log(`⏭  Exists: ${file} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
      success++;
      continue;
    }

    console.log(`📥 ${file}`);
    
    // Try multiple sources in order
    const sources = ['JSDELIVR', 'GITHUB', 'UNPKG'];
    const downloaded = await downloadWithFallback(file, sources);
    
    if (downloaded) {
      success++;
    } else {
      failed++;
      if (required) {
        console.log(`   ❌ CRITICAL: Required model ${file} failed to download`);
        createPlaceholder(file);
        placeholders++;
      } else {
        console.log(`   ⚠ Optional model ${file} not available, creating placeholder`);
        createPlaceholder(file);
        placeholders++;
      }
    }
    console.log(''); // Add spacing
  }

  console.log(`\n═══ Summary ═══════════════════════════════════════════`);
  console.log(`   ✅ Successfully downloaded: ${success}`);
  console.log(`   ⚠ Placeholders created: ${placeholders}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📂 Location: ${modelsDir}`);
  
  // Calculate total size
  let totalSize = 0;
  const files = fs.readdirSync(modelsDir);
  for (const file of files) {
    const stats = fs.statSync(path.join(modelsDir, file));
    totalSize += stats.size;
  }
  console.log(`   💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // List which core models are available
  console.log(`\n═══ Core Models Status ═══════════════════════════════════`);
  const coreModels = ['blazeface.json', 'blazeface.bin', 'facemesh.json', 'facemesh.bin', 'faceres.json', 'faceres.bin'];
  for (const model of coreModels) {
    const exists = fs.existsSync(path.join(modelsDir, model));
    const size = exists ? fs.statSync(path.join(modelsDir, model)).size : 0;
    const status = exists && size > 0 ? '✅' : '❌';
    console.log(`   ${status} ${model}${exists && size > 0 ? ` (${(size / 1024).toFixed(0)} KB)` : ''}`);
  }
  
  console.log(`\n✨ Download complete!`);
  console.log(`\n💡 Note: Placeholder files prevent 404 errors but won't enable functionality.`);
  console.log(`   To use advanced features (hand/body/object detection), you need to manually`);
  console.log(`   obtain those model files from the official Human repository.`);
}

main().catch((err) => { 
  console.error('Fatal error:', err); 
  process.exit(1); 
});