const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    console.log('PDF Generator: Using simple HTML fallback');
  }

  async generateBookPDF(book, outputPath) {
    console.log(`PDF Generator: Creating HTML version for ${book.title}`);
    
    // Criar uma versão HTML simples para impressão/PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${book.title}</title>
    <style>
        body { 
            font-family: Georgia, serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            color: #333;
        }
        h1 { 
            color: #2d5a27; 
            page-break-before: always;
            margin-top: 40px;
        }
        h2 { 
            color: #4a7c59; 
            margin-top: 30px;
        }
        .cover { 
            text-align: center; 
            page-break-after: always; 
            padding: 100px 0;
        }
        .cover h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            page-break-before: auto;
        }
        .chapter { 
            page-break-before: always; 
            margin-bottom: 40px;
        }
        p { 
            text-align: justify; 
            margin-bottom: 15px;
        }
        @media print {
            body { margin: 0; padding: 15mm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="cover">
        <h1>${book.title}</h1>
        <p><strong>por ${book.author}</strong></p>
    </div>
    
    ${book.chapters ? book.chapters.map(chapter => `
        <div class="chapter">
            <h1>Capítulo ${chapter.number}: ${chapter.title}</h1>
            ${chapter.content || '<p>Conteúdo do capítulo será carregado.</p>'}
        </div>
    `).join('') : ''}
</body>
</html>`;

    const htmlPath = outputPath.replace('.pdf', '.html');
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log(`PDF Generator: HTML version created at ${htmlPath}`);
    console.log(`PDF Generator: Users can use browser "Print to PDF" to generate PDF`);
    
    return htmlPath;
  }
}

module.exports = PDFGenerator;
