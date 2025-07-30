#!/usr/bin/env node

// Simple fallback script for environments where Puppeteer fails
const fs = require('fs-extra');
const path = require('path');

async function createFallbackDownloads() {
    const distDir = path.resolve(__dirname, '../dist');
    const booksDir = path.join(distDir, 'books');
    
    if (!await fs.pathExists(booksDir)) {
        console.log('No books directory found, skipping fallback downloads');
        return;
    }
    
    const bookDirs = await fs.readdir(booksDir);
    
    for (const bookDir of bookDirs) {
        const downloadsDir = path.join(booksDir, bookDir, 'downloads');
        
        if (await fs.pathExists(downloadsDir)) {
            const pdfPath = path.join(downloadsDir, `${bookDir}.pdf`);
            
            // Check if PDF exists and is not a placeholder
            if (await fs.pathExists(pdfPath)) {
                const content = await fs.readFile(pdfPath, 'utf8');
                if (content.includes('placeholder') || content.includes('Generation failed')) {
                    console.log(`Creating fallback download notice for ${bookDir}`);
                    
                    const fallbackContent = `
# Downloads temporariamente indisponíveis

Os downloads em PDF para este livro estão temporariamente indisponíveis devido a problemas técnicos.

Por favor, leia o conteúdo online em: https://jeanmeira.github.io/tech/books/${bookDir}/

Estamos trabalhando para resolver este problema o mais rápido possível.

---
Gerado automaticamente em ${new Date().toISOString()}
                    `.trim();
                    
                    await fs.writeFile(pdfPath, fallbackContent);
                }
            }
        }
    }
}

if (require.main === module) {
    createFallbackDownloads().catch(console.error);
}

module.exports = createFallbackDownloads;
