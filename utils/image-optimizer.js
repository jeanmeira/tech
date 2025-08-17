const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');

class ImageOptimizer {
    constructor() {
        this.rootDir = path.resolve(__dirname, '..');
        this.contentImagesDir = path.join(this.rootDir, 'content/images');
        this.distImagesDir = path.join(this.rootDir, 'dist/assets/images');
        
        // Define image sizes for responsive images
        this.sizes = [
            { suffix: '-200', width: 200, height: 200, quality: 85 },
            { suffix: '-400', width: 400, height: 400, quality: 85 },
            { suffix: '-800', width: 800, height: 800, quality: 80 },
            { suffix: '', width: 1024, height: 1024, quality: 80 } // Original size
        ];
    }

    async optimizeImages() {
        console.log('🖼️  Starting image optimization...');
        
        try {
            await fs.ensureDir(this.distImagesDir);
            
            // Get all image files
            const files = await fs.readdir(this.contentImagesDir);
            const imageFiles = files.filter(file => 
                /\.(png|jpg|jpeg)$/i.test(file) && 
                !file.startsWith('README')
            );
            
            console.log(`Found ${imageFiles.length} images to optimize`);
            
            const optimizedImages = new Map();
            
            for (const file of imageFiles) {
                const inputPath = path.join(this.contentImagesDir, file);
                const baseName = path.parse(file).name;
                const ext = path.parse(file).ext.toLowerCase();
                
                console.log(`Processing: ${file}`);
                
                // Get original image info
                const metadata = await sharp(inputPath).metadata();
                console.log(`  Original: ${metadata.width}x${metadata.height}, ${Math.round(metadata.size / 1024)}KB`);
                
                const imageVariants = [];
                
                // Generate WebP versions in multiple sizes
                for (const size of this.sizes) {
                    const webpFilename = `${baseName}${size.suffix}.webp`;
                    const webpPath = path.join(this.distImagesDir, webpFilename);
                    
                    await sharp(inputPath)
                        .resize(size.width, size.height, {
                            fit: 'contain',
                            background: { r: 248, g: 249, b: 250, alpha: 1 } // Light gray background
                        })
                        .webp({ quality: size.quality })
                        .toFile(webpPath);
                    
                    const webpStats = await fs.stat(webpPath);
                    const savings = Math.round((1 - webpStats.size / metadata.size) * 100);
                    
                    console.log(`  ✅ WebP ${size.width}x${size.height}: ${Math.round(webpStats.size / 1024)}KB (${savings}% smaller)`);
                    
                    imageVariants.push({
                        format: 'webp',
                        width: size.width,
                        height: size.height,
                        filename: webpFilename,
                        size: webpStats.size
                    });
                }
                
                // Generate fallback PNG versions (smaller sizes only)
                for (const size of this.sizes.slice(0, 3)) { // Only 200, 400, 800 - skip original
                    const pngFilename = `${baseName}${size.suffix}.png`;
                    const pngPath = path.join(this.distImagesDir, pngFilename);
                    
                    await sharp(inputPath)
                        .resize(size.width, size.height, {
                            fit: 'contain',
                            background: { r: 248, g: 249, b: 250, alpha: 1 }
                        })
                        .png({ quality: 80, compressionLevel: 9 })
                        .toFile(pngPath);
                    
                    imageVariants.push({
                        format: 'png',
                        width: size.width,
                        height: size.height,
                        filename: pngFilename,
                        size: (await fs.stat(pngPath)).size
                    });
                }
                
                // Copy original as fallback
                const originalFilename = file;
                const originalPath = path.join(this.distImagesDir, originalFilename);
                await fs.copy(inputPath, originalPath);
                
                imageVariants.push({
                    format: ext.replace('.', ''),
                    width: metadata.width,
                    height: metadata.height,
                    filename: originalFilename,
                    size: metadata.size,
                    isOriginal: true
                });
                
                optimizedImages.set(baseName, imageVariants);
            }
            
            // Generate image manifest for use in templates
            await this.generateImageManifest(optimizedImages);
            
            console.log('✅ Image optimization completed!');
            return optimizedImages;
            
        } catch (error) {
            console.error('❌ Image optimization failed:', error);
            throw error;
        }
    }
    
    async generateImageManifest(optimizedImages) {
        const manifest = {};
        
        for (const [baseName, variants] of optimizedImages) {
            manifest[baseName] = {
                webp: {
                    small: variants.find(v => v.format === 'webp' && v.width === 200)?.filename,
                    medium: variants.find(v => v.format === 'webp' && v.width === 400)?.filename,
                    large: variants.find(v => v.format === 'webp' && v.width === 800)?.filename,
                    original: variants.find(v => v.format === 'webp' && v.width === 1024)?.filename
                },
                png: {
                    small: variants.find(v => v.format === 'png' && v.width === 200)?.filename,
                    medium: variants.find(v => v.format === 'png' && v.width === 400)?.filename,
                    large: variants.find(v => v.format === 'png' && v.width === 800)?.filename,
                    original: variants.find(v => v.isOriginal)?.filename
                },
                sizes: {
                    small: '200w',
                    medium: '400w', 
                    large: '800w',
                    original: '1024w'
                }
            };
        }
        
        const manifestPath = path.join(this.rootDir, 'dist/assets/images/manifest.json');
        await fs.writeJson(manifestPath, manifest, { spaces: 2 });
        
        console.log('📄 Generated image manifest');
    }
    
    // Helper method to get responsive image HTML
    generateResponsiveImageHTML(baseName, alt, className = 'card-image', loading = 'lazy') {
        const baseUrl = process.env.NODE_ENV === 'production' ? '/tech' : '';
        
        return `
<picture>
    <source 
        srcset="${baseUrl}/assets/images/${baseName}-200.webp 200w,
                ${baseUrl}/assets/images/${baseName}-400.webp 400w,
                ${baseUrl}/assets/images/${baseName}-800.webp 800w,
                ${baseUrl}/assets/images/${baseName}.webp 1024w"
        sizes="(max-width: 480px) 200px, (max-width: 768px) 400px, 400px"
        type="image/webp">
    <source 
        srcset="${baseUrl}/assets/images/${baseName}-200.png 200w,
                ${baseUrl}/assets/images/${baseName}-400.png 400w,
                ${baseUrl}/assets/images/${baseName}-800.png 800w"
        sizes="(max-width: 480px) 200px, (max-width: 768px) 400px, 400px">
    <img 
        src="${baseUrl}/assets/images/${baseName}-400.png" 
        alt="${alt}" 
        class="${className}"
        loading="${loading}"
        width="400" 
        height="400">
</picture>`.trim();
    }
}

module.exports = ImageOptimizer;
