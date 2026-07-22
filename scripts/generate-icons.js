import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Icons config
// ---------------------------------------------------------------------------
const ICON_SOURCE = 'static/eaps.svg';
const ICON_TARGET_DIR = 'static/icons';
const ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const MASKABLE_BG = { r: 0, g: 0, b: 0, alpha: 1 };

// ---------------------------------------------------------------------------
// Screenshots config
// ---------------------------------------------------------------------------
const SCREENSHOT_TARGET_DIR = 'static/screenshots';

// Update these to match your actual source files in the static folder
const SCREENSHOT_SOURCES = [
    {
        input: 'static/desktop-wide.png', // <-- change to your actual filename
        output: path.join(SCREENSHOT_TARGET_DIR, 'desktop-wide.png'),
        width: 1280,
        height: 800,
        label: 'desktop'
    },
    {
        input: 'static/mobile-narrow.png', // <-- change to your actual filename
        output: path.join(SCREENSHOT_TARGET_DIR, 'mobile-narrow.png'),
        width: 750,
        height: 1334,
        label: 'mobile'
    }
];

// ---------------------------------------------------------------------------
// Icon generation
// ---------------------------------------------------------------------------
async function generateIcons() {
    console.log(`🚀 Starting icon generation from: ${ICON_SOURCE}`);

    if (!fs.existsSync(ICON_SOURCE)) {
        console.warn(`⚠️  Skipping icons: source "${ICON_SOURCE}" not found.`);
        return;
    }

    if (!fs.existsSync(ICON_TARGET_DIR)) {
        fs.mkdirSync(ICON_TARGET_DIR, { recursive: true });
    }

    try {
        // --- Standard "any" purpose icons (transparent background) ---
        const anyIconPromises = ICON_SIZES.map(async (size) => {
            const outputPath = path.join(ICON_TARGET_DIR, `icon-${size}x${size}.png`);

            await sharp(ICON_SOURCE)
                .trim()
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated: ${outputPath}`);
        });

        await Promise.all(anyIconPromises);

        // --- Maskable icon (512x512) ---
        const maskableSize = 512;
        const safeZoneRatio = 0.8;
        const contentSize = Math.round(maskableSize * safeZoneRatio);
        const padding = Math.round((maskableSize - contentSize) / 2);

        const maskableOutputPath = path.join(ICON_TARGET_DIR, `icon-maskable-512x512.png`);

        const resizedContent = await sharp(ICON_SOURCE)
            .trim()
            .resize(contentSize, contentSize, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

        await sharp({
            create: {
                width: maskableSize,
                height: maskableSize,
                channels: 4,
                background: MASKABLE_BG
            }
        })
            .composite([{ input: resizedContent, top: padding, left: padding }])
            .png()
            .toFile(maskableOutputPath);

        console.log(`✅ Generated: ${maskableOutputPath}`);
    } catch (error) {
        console.error('An error occurred during icon generation:', error);
    }
}

// ---------------------------------------------------------------------------
// Screenshot generation
// ---------------------------------------------------------------------------
async function generateScreenshots() {
    console.log('\n🚀 Resizing PWA screenshots to manifest dimensions...');

    if (!fs.existsSync(SCREENSHOT_TARGET_DIR)) {
        fs.mkdirSync(SCREENSHOT_TARGET_DIR, { recursive: true });
    }

    for (const { input, output, width, height, label } of SCREENSHOT_SOURCES) {
        if (!fs.existsSync(input)) {
            console.warn(`⚠️  Skipping ${label}: source "${input}" not found.`);
            continue;
        }

        try {
            await sharp(input)
                .resize(width, height, {
                    fit: 'cover',
                    position: 'center'
                })
                .png()
                .toFile(output);

            console.log(`✅ Generated ${label}: ${output} (${width}x${height})`);
        } catch (error) {
            console.error(`An error occurred generating ${label}:`, error);
        }
    }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function run() {
    await generateIcons();
    await generateScreenshots();
    console.log('\x1b[32m%s\x1b[0m', '\nDone!');
}

run();