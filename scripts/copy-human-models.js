// scripts/copy-human-models.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.join(__dirname, '..', 'node_modules', '@vladmandic', 'human', 'models');
const destDir = path.join(__dirname, '..', 'static', 'models', 'human');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`📁 Created: ${destDir}`);
}

// Check if source exists
if (!fs.existsSync(sourceDir)) {
  console.error(`❌ Source not found: ${sourceDir}`);
  console.error('Make sure @vladmandic/human is installed');
  process.exit(1);
}

// Get all model files
const modelFiles = fs.readdirSync(sourceDir).filter(file => 
  file.endsWith('.json') || file.endsWith('.bin')
);

console.log(`📦 Copying ${modelFiles.length} model files...\n`);

let copied = 0;
let skipped = 0;

for (const file of modelFiles) {
  const source = path.join(sourceDir, file);
  const dest = path.join(destDir, file);
  
  // Check if destination already exists
  if (fs.existsSync(dest)) {
    const sourceSize = fs.statSync(source).size;
    const destSize = fs.statSync(dest).size;
    
    if (sourceSize === destSize) {
      console.log(`⏭  Skipped: ${file} (already exists)`);
      skipped++;
      continue;
    }
  }
  
  // Copy file
  fs.copyFileSync(source, dest);
  const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(`✅ Copied: ${file} (${sizeKB} KB)`);
  copied++;
}

console.log(`\n── Summary ──────────────────────────────────────────`);
console.log(`   ✅ Copied: ${copied}`);
console.log(`   ⏭  Skipped: ${skipped}`);
console.log(`   📂 Source: ${sourceDir}`);
console.log(`   📂 Destination: ${destDir}`);
console.log(`\n✨ All models copied successfully!`);