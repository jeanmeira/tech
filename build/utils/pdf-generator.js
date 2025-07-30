const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (this.browser) return;
    
    // Configuração otimizada para CI/CD e desenvolvimento local
    const puppeteerOptions = {
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Para ambientes com pouca memória
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    // Em ambiente CI, use chromium disponível no sistema
    if (process.env.CI) {
      puppeteerOptions.executablePath = '/usr/bin/google-chrome-stable';
    }

    try {
      this.browser = await puppeteer.launch(puppeteerOptions);
      console.log('✅ Puppeteer browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Puppeteer:', error.message);
      throw error;
    }
  }

  async generateBookPDF(bookData, chapters, outputPath) {
    if (!this.browser) {
      await this.initialize();
    }

    try {
      const page = await this.browser.newPage();
      
      // Configurar viewport e media para impressão
      await page.setViewport({ width: 1200, height: 1600 });
      await page.emulateMediaType('print');

      // HTML template para o PDF
      const htmlContent = this.generateBookHTML(bookData, chapters);
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Opções do PDF otimizadas
      const pdfOptions = {
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '0.8in',
          bottom: '1in',
          left: '0.8in'
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; padding: 0 1in; width: 100%; text-align: center;">
            <span>${bookData.title}</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; padding: 0 1in; width: 100%; text-align: center;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `
      };

      await page.pdf(pdfOptions);
      await page.close();

      console.log(`✅ PDF generated: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error('❌ Error generating PDF:', error.message);
      throw error;
    }
  }

  generateBookHTML(bookData, chapters) {
    const css = `
      <style>
        @page {
          size: A4;
          margin: 1in 0.8in;
        }
        
        body {
          font-family: 'Georgia', serif;
          line-height: 1.6;
          color: #333;
          font-size: 12pt;
        }
        
        h1 {
          color: #2d5a27;
          font-size: 24pt;
          margin-bottom: 0.5in;
          page-break-after: avoid;
        }
        
        h2 {
          color: #4a7c59;
          font-size: 18pt;
          margin-top: 0.3in;
          margin-bottom: 0.2in;
          page-break-after: avoid;
        }
        
        h3 {
          color: #2d5a27;
          font-size: 14pt;
          margin-top: 0.2in;
          margin-bottom: 0.1in;
        }
        
        p {
          margin-bottom: 0.15in;
          text-align: justify;
        }
        
        .chapter {
          page-break-before: always;
          margin-bottom: 0.5in;
        }
        
        .chapter:first-child {
          page-break-before: auto;
        }
        
        .chapter-number {
          color: #4a7c59;
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 0.1in;
        }
        
        .chapter-subtitle {
          color: #666;
          font-style: italic;
          font-size: 11pt;
          margin-bottom: 0.3in;
        }
        
        .cover-page {
          text-align: center;
          page-break-after: always;
          padding-top: 2in;
        }
        
        .cover-title {
          font-size: 36pt;
          color: #2d5a27;
          margin-bottom: 0.5in;
          font-weight: bold;
        }
        
        .cover-subtitle {
          font-size: 18pt;
          color: #4a7c59;
          margin-bottom: 1in;
        }
        
        .cover-author {
          font-size: 16pt;
          color: #333;
        }
        
        code {
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 10pt;
        }
        
        pre {
          background-color: #f5f5f5;
          padding: 0.2in;
          border-radius: 5px;
          overflow-x: auto;
          font-size: 9pt;
          line-height: 1.4;
        }
        
        blockquote {
          border-left: 4px solid #4a7c59;
          padding-left: 0.2in;
          margin-left: 0.1in;
          font-style: italic;
          color: #555;
        }
        
        ul, ol {
          margin-bottom: 0.15in;
        }
        
        li {
          margin-bottom: 0.05in;
        }
      </style>
    `;

    const coverPage = `
      <div class="cover-page">
        <h1 class="cover-title">${bookData.title}</h1>
        <p class="cover-subtitle">${bookData.subtitle || ''}</p>
        <p class="cover-author">por ${bookData.author}</p>
      </div>
    `;

    const chaptersHTML = chapters.map(chapter => `
      <div class="chapter">
        <div class="chapter-number">Capítulo ${chapter.number}</div>
        <h1>${chapter.title}</h1>
        ${chapter.subtitle ? `<div class="chapter-subtitle">${chapter.subtitle}</div>` : ''}
        <div class="chapter-content">
          ${chapter.content}
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${bookData.title}</title>
          ${css}
        </head>
        <body>
          ${coverPage}
          ${chaptersHTML}
        </body>
      </html>
    `;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('✅ Puppeteer browser closed');
    }
  }
}

module.exports = PDFGenerator;
