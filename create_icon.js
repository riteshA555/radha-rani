import sharp from 'sharp';

async function createSquareIcons() {
    try {
        // Read the original logo
        const logo = sharp('public/logo.png');
        const metadata = await logo.metadata();

        console.log(`Original logo size: ${metadata.width}x${metadata.height}`);

        // Create 512x512 icon
        const size512 = 512;
        const padding512 = 60;
        const maxLogoSize512 = size512 - (2 * padding512);

        // Calculate scale to fit logo
        const scale512 = Math.min(maxLogoSize512 / metadata.width, maxLogoSize512 / metadata.height);
        const newWidth512 = Math.round(metadata.width * scale512);
        const newHeight512 = Math.round(metadata.height * scale512);

        await sharp('public/logo.png')
            .resize(newWidth512, newHeight512, { fit: 'inside' })
            .extend({
                top: Math.round((size512 - newHeight512) / 2),
                bottom: Math.round((size512 - newHeight512) / 2),
                left: Math.round((size512 - newWidth512) / 2),
                right: Math.round((size512 - newWidth512) / 2),
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toFile('public/icon-512x512.png');

        console.log('✓ Created icon-512x512.png');

        // Create 192x192 icon
        const size192 = 192;
        const padding192 = 24;
        const maxLogoSize192 = size192 - (2 * padding192);

        const scale192 = Math.min(maxLogoSize192 / metadata.width, maxLogoSize192 / metadata.height);
        const newWidth192 = Math.round(metadata.width * scale192);
        const newHeight192 = Math.round(metadata.height * scale192);

        await sharp('public/logo.png')
            .resize(newWidth192, newHeight192, { fit: 'inside' })
            .extend({
                top: Math.round((size192 - newHeight192) / 2),
                bottom: Math.round((size192 - newHeight192) / 2),
                left: Math.round((size192 - newWidth192) / 2),
                right: Math.round((size192 - newWidth192) / 2),
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toFile('public/icon-192x192.png');

        console.log('✓ Created icon-192x192.png');
        console.log('\nSquare icons created successfully!');

    } catch (error) {
        console.error('Error creating icons:', error);
        process.exit(1);
    }
}

createSquareIcons();
