const fs = require("fs");
const path = require("path");
const PDFDocument = require('pdfkit');

class PDFGenerator {
  constructor() {
    console.log("PDF Generator: Using PDFKit for professional PDF generation");
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
            text: finalQuoteText // Store as simple string, not parsed
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

  // Render text with inline formatting
  renderFormattedText(doc, formattedParts, options = {}) {
    if (typeof formattedParts === 'string') {
      doc.text(formattedParts, options);
      return;
    }

    if (!Array.isArray(formattedParts)) {
      doc.text('', options);
      return;
    }

    // For PDFKit, we need to handle continued text properly
    formattedParts.forEach((part, index) => {
      const isLast = index === formattedParts.length - 1;
      
      switch (part.type) {
        case 'bold':
          doc.font('Helvetica-Bold');
          break;
        case 'italic':
          doc.font('Helvetica-Oblique');
          break;
        default:
          doc.font('Helvetica');
          break;
      }
      
      if (isLast) {
        // Last part - apply all options
        doc.text(part.content, options);
      } else {
        // Continue text for inline formatting
        doc.text(part.content, { ...options, continued: true });
      }
    });
    
    // Reset font to default
    doc.font('Helvetica');
  }

  async generateBookPDF(book, chapters, outputPath) {
    try {
      console.log(`PDF Generator: Creating professional PDF for ${book.title}`);
      
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true // Optimize memory usage
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      doc.info.Title = book.title;
      doc.info.Author = book.author || 'Jean Meira';

      // Cover page
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .text(book.title, { align: 'center' })
         .moveDown(2);

      if (book.author) {
        doc.fontSize(16)
           .font('Helvetica')
           .text(`por ${book.author}`, { align: 'center' })
           .moveDown();
      }

      // Process chapters using the provided chapters array
      const allContent = [];
      const tocEntries = [];

      // Introduction
      const bookPath = path.dirname(chapters[0]?.path || '');
      const introPath = path.join(bookPath, 'introducao.md');
      if (fs.existsSync(introPath)) {
        const intro = fs.readFileSync(introPath, 'utf-8');
        if (intro.trim()) {
          const parsedIntro = this.parseMarkdownContent(intro);
          allContent.push({ type: 'intro', title: 'Introdução', content: parsedIntro });
          tocEntries.push({ title: 'Introdução', page: 2 });
        }
      }

      // Process chapters from the provided array
      chapters.forEach((chapter, index) => {
        // Convert HTML back to markdown-like structure for parsing
        // For now, we'll try to read the original markdown file
        const bookDir = path.dirname(chapters[0]?.path || book.slug || '');
        let chapterContent = '';
        
        // Try to find the original markdown file
        const possiblePaths = [
          path.join(`content/books/${book.slug}`, chapter.file || `capitulo-${(index + 1).toString().padStart(2, '0')}.md`),
          path.join(bookDir, chapter.file || `capitulo-${(index + 1).toString().padStart(2, '0')}.md`)
        ];
        
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            chapterContent = fs.readFileSync(possiblePath, 'utf-8');
            break;
          }
        }
        
        if (chapterContent) {
          const parsedChapter = this.parseMarkdownContent(chapterContent);
          
          allContent.push({ type: 'chapter', title: chapter.title, content: parsedChapter });
          tocEntries.push({ title: chapter.title, page: tocEntries.length + 3 });
        }
      });

      console.log(`Total content sections: ${allContent.length}`);

      // Table of Contents
      console.log('PDF Generator: Adding Table of Contents...');
      doc.addPage()
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('Índice', { align: 'center' })
         .moveDown(1);

      console.log(`PDF Generator: TOC entries: ${tocEntries.length}`);
      tocEntries.forEach(entry => {
        doc.fontSize(12)
           .font('Helvetica')
           .text(`${entry.title}`, 50, doc.y, { continued: true })
           .text(`${entry.page}`, { align: 'right' })
           .moveDown(0.3);
      });

      // Generate content
      console.log('PDF Generator: Generating content sections...');
      allContent.forEach((section, sectionIndex) => {
        console.log(`PDF Generator: Processing section ${sectionIndex + 1}/${allContent.length}: ${section.title}`);
        doc.addPage();
        
        // Skip the first h1 since we'll use our own title
        const contentToRender = section.content.filter((item, index) => {
          return !(index === 0 && item.type === 'h1');
        });
        
        // Section title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(section.title, { align: 'left' })
           .moveDown(1);

        // Render content
        console.log(`PDF Generator: Rendering ${contentToRender.length} items for section: ${section.title}`);
        contentToRender.forEach((item, itemIndex) => {
          // Log progress less frequently to reduce overhead
          if (itemIndex % 20 === 0) {
            console.log(`PDF Generator: Processing item ${itemIndex + 1}/${contentToRender.length} of type: ${item.type}`);
          }
          switch (item.type) {
            case 'h2':
              doc.fontSize(16)
                 .font('Helvetica-Bold')
                 .moveDown(0.6);
              this.renderFormattedText(doc, item.text, { align: 'left' });
              doc.moveDown(0.5);
              break;
            case 'h3':
              doc.fontSize(14)
                 .font('Helvetica-Bold')
                 .moveDown(0.5);
              this.renderFormattedText(doc, item.text, { align: 'left' });
              doc.moveDown(0.4);
              break;
            case 'h4':
              doc.fontSize(12)
                 .font('Helvetica-Bold')
                 .moveDown(0.4);
              this.renderFormattedText(doc, item.text, { align: 'left' });
              doc.moveDown(0.3);
              break;
            case 'hr':
              doc.moveDown(0.5)
                 .moveTo(50, doc.y)
                 .lineTo(doc.page.width - 50, doc.y)
                 .stroke()
                 .moveDown(0.5);
              break;
            case 'quote':
              doc.fontSize(11)
                 .font('Helvetica-Oblique')
                 .moveDown(0.4);
              
              // Save original position to restore after quote
              const originalX = 50; // Standard margin
              
              // Simple text rendering for quotes - no complex parsing
              const lines = item.text.split('\n');
              lines.forEach((line, index) => {
                if (line.trim()) {
                  doc.text(line, originalX + 20, doc.y, {
                    width: doc.page.width - 120,
                    align: 'left',
                    lineGap: 2
                  });
                }
                if (index < lines.length - 1) {
                  doc.moveDown(0.3);
                }
              });
              
              // Reset position and formatting for content after quote
              doc.moveDown(0.4)
                 .font('Helvetica');
              // Explicitly reset x position for next content
              doc.x = originalX;
              break;
            case 'list':
              doc.fontSize(11)
                 .font('Helvetica')
                 .moveDown(0.2);
              // Add bullet point manually to the formatted text
              const listParts = [{ type: 'text', content: '• ' }].concat(item.text);
              this.renderFormattedText(doc, listParts, { align: 'left', indent: 15 });
              doc.moveDown(0.2);
              break;
            case 'paragraph':
              doc.fontSize(11)
                 .font('Helvetica')
                 .moveDown(0.3);
              this.renderFormattedText(doc, item.text, { align: 'left' });
              doc.moveDown(0.3);
              break;
          }
        });
      });

      console.log('PDF Generator: Finalizing PDF...');
      doc.end();

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('PDF generation timeout after 30 seconds'));
        }, 30000); // 30 second timeout
        
        stream.on('finish', () => {
          clearTimeout(timeout);
          resolve();
        });
        stream.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      console.log(`PDF Generator: Professional PDF created at ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error('PDF Generator: Error creating PDF:', error);
      throw error;
    }
  }
}

module.exports = PDFGenerator;
