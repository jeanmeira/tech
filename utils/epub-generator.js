const fs = require("fs");
const path = require("path");
const archiver = require('archiver');

class EPUBGenerator {
  constructor() {
    console.log("EPUB Generator: Using professional EPUB 3.0 generation");
  }

  parseMarkdownContent(markdown) {
    const lines = markdown.split('\n');
    const content = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) continue;
      
      if (line.match(/^---+$/)) {
        content.push({ type: 'hr' });
        continue;
      }
      
      if (line.startsWith('# ')) {
        content.push({
          type: 'h1',
          text: this.parseInlineFormatting(line.replace(/^# /, '').trim())
        });
      } else if (line.startsWith('## ')) {
        content.push({
          type: 'h2',
          text: this.parseInlineFormatting(line.replace(/^## /, '').trim())
        });
      } else if (line.startsWith('### ')) {
        content.push({
          type: 'h3',
          text: this.parseInlineFormatting(line.replace(/^### /, '').trim())
        });
      } else if (line.startsWith('#### ')) {
        content.push({
          type: 'h4',
          text: this.parseInlineFormatting(line.replace(/^#### /, '').trim())
        });
      } else if (line.startsWith('> ')) {
        // Process blockquote - collect ONE quote block at a time
        const allQuoteLines = [];
        let j = i;
        
        // Collect lines for this single quote block
        while (j < lines.length) {
          const currentLine = lines[j].trim();
          
          // If line starts with >, it's part of quote
          if (currentLine.startsWith('> ')) {
            allQuoteLines.push(currentLine.replace(/^> /, ''));
            j++;
          }
          // If it's just ">" (empty quote line), include it
          else if (currentLine === '>') {
            allQuoteLines.push('');
            j++;
          }
          // If it's a completely empty line, check if it's separating quotes
          else if (currentLine === '') {
            // Look ahead to see if there's another quote block
            if (j + 1 < lines.length && lines[j + 1].trim().startsWith('> ')) {
              // This is a separator between quotes - stop processing this quote
              break;
            } else {
              // Just an empty line within the quote, include it
              allQuoteLines.push('');
              j++;
            }
          }
          // Otherwise, we've reached the end of the quote block
          else {
            break;
          }
        }
        
        // Filter out empty lines and process
        const nonEmptyLines = allQuoteLines.filter(line => line.trim() !== '');
        
        if (nonEmptyLines.length > 0) {
          let quoteText = '';
          let author = '';
          
          // Check if last line is an author (starts with —)
          const lastLine = nonEmptyLines[nonEmptyLines.length - 1].trim();
          if (lastLine.startsWith('—')) {
            author = lastLine.replace(/^— /, '').trim();
            nonEmptyLines.pop(); // Remove author from quote text
          }
          
          // Join remaining lines as quote text
          quoteText = nonEmptyLines.join(' ').trim();
          
          // Remove markdown formatting from quote text
          quoteText = quoteText
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
            .replace(/\*(.*?)\*/g, '$1')      // Remove italic
            .replace(/__(.*?)__/g, '$1')      // Remove bold underscores
            .replace(/_(.*?)_/g, '$1');       // Remove italic underscores
          
          // Remove surrounding quotes if present
          if (quoteText.startsWith('"') && quoteText.endsWith('"')) {
            quoteText = quoteText.slice(1, -1).trim();
          }
          
          // Create final quote text - clean and simple
          let finalQuoteText = `"${quoteText}"`;
          if (author) {
            finalQuoteText += `\n\n— ${author}`;
          }
          
          content.push({
            type: 'quote',
            text: finalQuoteText
          });
        }
        
        // Move index to after processed quote
        i = j - 1;
        
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const listText = line.replace(/^[*-] /, '').trim();
        content.push({
          type: 'list',
          text: this.parseInlineFormatting(listText)
        });
      } else {
        let cleanText = line.replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
        if (cleanText) {
          content.push({
            type: 'paragraph',
            text: this.parseInlineFormatting(cleanText)
          });
        }
      }
    }
    
    return content;
  }

  // Parse inline formatting (bold, italic)
  parseInlineFormatting(text) {
    if (!text || typeof text !== 'string') {
      return [{ type: 'text', content: '' }];
    }
    
    const parts = [];
    let currentIndex = 0;
    
    // Find all formatting patterns - process bold first, then italic
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /\*([^*]+)\*/g;
    
    const matches = [];
    
    // Collect bold matches
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'bold',
        content: match[1],
        fullMatch: match[0]
      });
    }
    
    // Collect italic matches (but exclude those that are part of bold)
    while ((match = italicRegex.exec(text)) !== null) {
      // Check if this italic is not part of a bold pattern
      const isPartOfBold = matches.some(boldMatch => 
        match.index >= boldMatch.start && match.index < boldMatch.end
      );
      
      if (!isPartOfBold) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'italic',
          content: match[1],
          fullMatch: match[0]
        });
      }
    }
    
    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);
    
    // Process text with formatting
    matches.forEach(formatMatch => {
      // Add text before this match
      if (currentIndex < formatMatch.start) {
        const beforeText = text.substring(currentIndex, formatMatch.start);
        if (beforeText) {
          parts.push({ type: 'text', content: beforeText });
        }
      }
      
      // Add the formatted text
      parts.push({ type: formatMatch.type, content: formatMatch.content });
      
      currentIndex = formatMatch.end;
    });
    
    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText });
      }
    }
    
    // If no formatting found, return the whole text
    if (parts.length === 0) {
      return [{ type: 'text', content: text }];
    }
    
    return parts;
  }

  // Convert formatted text to HTML
  renderFormattedTextAsHTML(formattedParts) {
    if (typeof formattedParts === 'string') {
      return this.escapeHTML(formattedParts);
    }

    if (!Array.isArray(formattedParts)) {
      return '';
    }

    return formattedParts.map(part => {
      const content = this.escapeHTML(part.content);
      switch (part.type) {
        case 'bold':
          return `<strong>${content}</strong>`;
        case 'italic':
          return `<em>${content}</em>`;
        default:
          return content;
      }
    }).join('');
  }

  escapeHTML(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\u00A0/g, '&#160;'); // Non-breaking space for better compatibility
  }

  generateContentHTML(content) {
    return content.map(item => {
      switch (item.type) {
        case 'h1':
          return `<h1>${this.renderFormattedTextAsHTML(item.text)}</h1>`;
        case 'h2':
          return `<h2>${this.renderFormattedTextAsHTML(item.text)}</h2>`;
        case 'h3':
          return `<h3>${this.renderFormattedTextAsHTML(item.text)}</h3>`;
        case 'h4':
          return `<h4>${this.renderFormattedTextAsHTML(item.text)}</h4>`;
        case 'paragraph':
          return `<p>${this.renderFormattedTextAsHTML(item.text)}</p>`;
        case 'quote':
          const lines = item.text.split('\n').filter(line => line.trim());
          return `<blockquote>${lines.map(line => `<p>${this.escapeHTML(line)}</p>`).join('')}</blockquote>`;
        case 'list':
          return `<ul><li>${this.renderFormattedTextAsHTML(item.text)}</li></ul>`;
        case 'hr':
          return '<hr/>';
        default:
          return '';
      }
    }).join('\n');
  }

  generateCSS() {
    return `
/* EPUB CSS Styles */
body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 0;
  padding: 1em;
  color: #333;
}

h1, h2, h3, h4, h5, h6 {
  font-family: "Helvetica Neue", Arial, sans-serif;
  margin: 1.5em 0 0.5em 0;
  line-height: 1.2;
  font-weight: bold;
}

h1 {
  font-size: 1.8em;
  border-bottom: 2px solid #333;
  padding-bottom: 0.3em;
}

h2 {
  font-size: 1.5em;
  color: #444;
}

h3 {
  font-size: 1.3em;
  color: #555;
}

h4 {
  font-size: 1.1em;
  color: #666;
}

p {
  margin: 0.8em 0;
  text-align: justify;
}

blockquote {
  margin: 1.5em 2em;
  padding: 1em;
  background-color: #f9f9f9;
  border-left: 4px solid #ccc;
  font-style: italic;
}

blockquote p {
  margin: 0.5em 0;
}

ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}

li {
  margin: 0.3em 0;
}

hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}

strong {
  font-weight: bold;
}

em {
  font-style: italic;
}

/* Table of Contents */
.toc {
  page-break-after: always;
}

.toc h1 {
  text-align: center;
  margin-bottom: 2em;
}

.toc-entry {
  margin: 0.5em 0;
  padding: 0.3em 0;
  border-bottom: 1px dotted #ccc;
}

.toc-entry a {
  text-decoration: none;
  color: #333;
  display: flex;
  justify-content: space-between;
}

.toc-entry a:hover {
  color: #666;
}

/* Chapter titles */
.chapter-title {
  text-align: center;
  margin: 2em 0;
  page-break-before: always;
}
`;
  }

  async generateBookEPUB(book, chapters, outputPath) {
    try {
      console.log(`EPUB Generator: Creating professional EPUB for ${book.title}`);
      
      const rootDir = path.resolve(__dirname, '..');
      const tempDir = path.join(__dirname, 'temp-epub');
      
      // Create temp directory structure
      await fs.promises.mkdir(tempDir, { recursive: true });
      await fs.promises.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
      await fs.promises.mkdir(path.join(tempDir, 'OEBPS'), { recursive: true });
      await fs.promises.mkdir(path.join(tempDir, 'OEBPS', 'css'), { recursive: true });
      await fs.promises.mkdir(path.join(tempDir, 'OEBPS', 'text'), { recursive: true });

      // Process chapters using the provided chapters array
      const allContent = [];
      const tocEntries = [];

      // Introduction - only add if it's not the first chapter
      const firstChapterIsIntro = chapters[0]?.title?.toLowerCase().includes('introdução');
      
      if (!firstChapterIsIntro) {
        const introPath = path.join(rootDir, `content/books/${book.slug}`, 'introducao.md');
        console.log(`EPUB Generator: Looking for introduction at: ${introPath}`);
        if (fs.existsSync(introPath)) {
          console.log(`EPUB Generator: Found introduction file`);
          const intro = fs.readFileSync(introPath, 'utf-8');
          if (intro.trim()) {
            const parsedIntro = this.parseMarkdownContent(intro);
            allContent.push({ 
              type: 'intro', 
              title: 'Introdução', 
              content: parsedIntro,
              filename: 'intro.xhtml'
            });
            tocEntries.push({ title: 'Introdução', filename: 'intro.xhtml' });
          }
        } else {
          console.log(`EPUB Generator: Introduction file not found at ${introPath}`);
        }
      } else {
        console.log(`EPUB Generator: First chapter is introduction, skipping separate intro`);
      }

      // Process chapters from the provided array
      console.log(`EPUB Generator: Processing ${chapters.length} chapters`);
      chapters.forEach((chapter, index) => {
        console.log(`EPUB Generator: Looking for chapter ${index + 1}: ${chapter.title}`);
        
        let chapterContent = '';
        
        // Try to find the original markdown file with absolute paths
        const possiblePaths = [
          path.join(rootDir, `content/books/${book.slug}`, chapter.file || `capitulo-${(index + 1).toString().padStart(2, '0')}.md`),
          path.join(rootDir, `content/books/${book.slug}`, `capitulo-${(index + 1).toString().padStart(2, '0')}.md`)
        ];
        
        console.log(`EPUB Generator: Trying paths for chapter ${index + 1}:`, possiblePaths);
        
        for (const possiblePath of possiblePaths) {
          console.log(`EPUB Generator: Checking path: ${possiblePath}`);
          if (fs.existsSync(possiblePath)) {
            console.log(`EPUB Generator: Found file: ${possiblePath}`);
            chapterContent = fs.readFileSync(possiblePath, 'utf-8');
            break;
          }
        }
        
        if (chapterContent) {
          const parsedChapter = this.parseMarkdownContent(chapterContent);
          const filename = `chapter-${(index + 1).toString().padStart(2, '0')}.xhtml`;
          
          allContent.push({ 
            type: 'chapter', 
            title: chapter.title, 
            content: parsedChapter,
            filename: filename
          });
          tocEntries.push({ title: chapter.title, filename: filename });
          console.log(`EPUB Generator: Added chapter: ${chapter.title}`);
        } else {
          console.log(`EPUB Generator: WARNING - No content found for chapter: ${chapter.title}`);
        }
      });

      console.log(`Total content sections: ${allContent.length}`);
      if (allContent.length === 0) {
        console.log('EPUB Generator: ERROR - No content sections found! Check file paths and chapter configuration.');
        throw new Error('No content found for EPUB generation');
      }

      // Generate mimetype file
      await fs.promises.writeFile(
        path.join(tempDir, 'mimetype'),
        'application/epub+zip'
      );

      // Generate container.xml
      const containerXML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
      await fs.promises.writeFile(
        path.join(tempDir, 'META-INF', 'container.xml'),
        containerXML
      );

      // Generate CSS
      await fs.promises.writeFile(
        path.join(tempDir, 'OEBPS', 'css', 'styles.css'),
        this.generateCSS()
      );

      // Generate content.opf
      const contentOPF = this.generateContentOPF(book, allContent);
      await fs.promises.writeFile(
        path.join(tempDir, 'OEBPS', 'content.opf'),
        contentOPF
      );

      // Generate toc.ncx
      const tocNCX = this.generateTocNCX(book, tocEntries);
      await fs.promises.writeFile(
        path.join(tempDir, 'OEBPS', 'toc.ncx'),
        tocNCX
      );

      // Generate table of contents HTML
      const tocHTML = this.generateTocHTML(tocEntries);
      await fs.promises.writeFile(
        path.join(tempDir, 'OEBPS', 'text', 'toc.xhtml'),
        tocHTML
      );

      // Generate content files
      for (const section of allContent) {
        const html = this.generateChapterHTML(section);
        await fs.promises.writeFile(
          path.join(tempDir, 'OEBPS', 'text', section.filename),
          html
        );
      }

      // Create EPUB ZIP
      await this.createEPUBZip(tempDir, outputPath);

      // Cleanup temp directory
      await fs.promises.rm(tempDir, { recursive: true, force: true });

      console.log(`EPUB Generator: Professional EPUB created at ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error('EPUB Generator: Error creating EPUB:', error);
      throw error;
    }
  }

  generateContentOPF(book, allContent) {
    const uuid = `urn:uuid:${book.slug}-${Date.now()}`;
    const timestamp = new Date().toISOString().split('T')[0];
    
    const manifest = allContent.map(section => 
      `    <item id="${section.filename.replace('.xhtml', '')}" href="text/${section.filename}" media-type="application/xhtml+xml"/>`
    ).join('\n');

    const spine = allContent.map(section => 
      `    <itemref idref="${section.filename.replace('.xhtml', '')}"/>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${uuid}</dc:identifier>
    <dc:title>${this.escapeHTML(book.title)}</dc:title>
    <dc:creator>${this.escapeHTML(book.author || 'Jean Meira')}</dc:creator>
    <dc:language>pt-BR</dc:language>
    <dc:date>${timestamp}</dc:date>
    <dc:description>${this.escapeHTML(book.description || '')}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
  </metadata>
  
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="css/styles.css" media-type="text/css"/>
    <item id="toc" href="text/toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${manifest}
  </manifest>
  
  <spine toc="ncx">
    <itemref idref="toc"/>
${spine}
  </spine>
</package>`;
  }

  generateTocNCX(book, tocEntries) {
    const navPoints = tocEntries.map((entry, index) => `
    <navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">
      <navLabel>
        <text>${this.escapeHTML(entry.title)}</text>
      </navLabel>
      <content src="text/${entry.filename}"/>
    </navPoint>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${book.slug}-${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  
  <docTitle>
    <text>${this.escapeHTML(book.title)}</text>
  </docTitle>
  
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
  }

  generateTocHTML(tocEntries) {
    const tocList = tocEntries.map(entry => 
      `      <li><a href="${entry.filename}">${this.escapeHTML(entry.title)}</a></li>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR">
<head>
  <title>Índice</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <link rel="stylesheet" type="text/css" href="../css/styles.css"/>
</head>
<body>
  <div class="toc">
    <h1>Índice</h1>
    <nav>
      <ol>
${tocList}
      </ol>
    </nav>
  </div>
</body>
</html>`;
  }

  generateChapterHTML(section) {
    const contentHTML = this.generateContentHTML(section.content);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR">
<head>
  <title>${this.escapeHTML(section.title)}</title>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <link rel="stylesheet" type="text/css" href="../css/styles.css"/>
</head>
<body>
  <div class="chapter">
    <h1 class="chapter-title">${this.escapeHTML(section.title)}</h1>
    ${contentHTML}
  </div>
</body>
</html>`;
  }

  async createEPUBZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 0 }, // No compression for better compatibility
        forceLocalTime: true,
        comment: ''
      });

      output.on('close', () => {
        console.log(`EPUB Generator: Created ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add mimetype first (MUST be uncompressed and first for EPUB compliance)
      archive.file(path.join(sourceDir, 'mimetype'), { 
        name: 'mimetype', 
        store: true,
        date: new Date(2023, 0, 1) // Fixed date for consistency
      });
      
      // Add META-INF directory with fixed dates
      archive.directory(path.join(sourceDir, 'META-INF'), 'META-INF', {
        date: new Date(2023, 0, 1)
      });
      
      // Add OEBPS directory with fixed dates
      archive.directory(path.join(sourceDir, 'OEBPS'), 'OEBPS', {
        date: new Date(2023, 0, 1)
      });

      archive.finalize();
    });
  }
}

module.exports = EPUBGenerator;
