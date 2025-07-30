#!/usr/bin/env node

const PDFGenerator = require('./utils/pdf-generator');

async function testPuppeteer() {
    console.log('🧪 Testing Puppeteer setup...');
    
    const pdfGenerator = new PDFGenerator();
    
    try {
        await pdfGenerator.initialize();
        console.log('✅ Puppeteer initialized successfully');
        
        // Simple test data
        const testBookData = {
            title: 'Test Book',
            subtitle: 'Testing PDF Generation',
            author: 'Test Author'
        };
        
        const testChapters = [{
            number: 1,
            title: 'Test Chapter',
            subtitle: 'A simple test',
            content: '<p>This is a test chapter content.</p>'
        }];
        
        const testPath = './test-output.pdf';
        await pdfGenerator.generateBookPDF(testBookData, testChapters, testPath);
        
        // Clean up test file
        const fs = require('fs-extra');
        if (await fs.pathExists(testPath)) {
            await fs.remove(testPath);
            console.log('✅ PDF generation test completed successfully');
        }
        
    } catch (error) {
        console.error('❌ Puppeteer test failed:', error.message);
        process.exit(1);
    } finally {
        await pdfGenerator.close();
    }
}

if (require.main === module) {
    testPuppeteer();
}

module.exports = testPuppeteer;
