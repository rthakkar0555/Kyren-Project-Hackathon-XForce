const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

try {
    if (fs.existsSync(envPath)) {
        const buf = fs.readFileSync(envPath);

        // Check for UTF-16 LE BOM (FF FE) or BE (FE FF)
        // PowerShell 'echo > file' usually creates UTF-16 LE with BOM
        if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
            console.log('Detected UTF-16 LE encoding. Converting to UTF-8...');
            const content = buf.toString('utf16le');
            fs.writeFileSync(envPath, content.trim(), 'utf8');
            console.log('Successfully converted .env to UTF-8.');
        } else {
            console.log('File does not appear to be UTF-16 LE containing BOM.');
            // Attempt to read as string and checking for null bytes which indicate UTF-16
            const str = buf.toString();
            if (str.indexOf('\u0000') !== -1) {
                console.log('Null bytes detected, suspecting raw UTF-16 without BOM. Converting...');
                const content = buf.toString('utf16le');
                fs.writeFileSync(envPath, content.trim(), 'utf8');
                console.log('Converted.');
            } else {
                console.log('.env seems to be UTF-8 or ASCII already.');
            }
        }
    } else {
        console.error('.env file not found!');
    }
} catch (error) {
    console.error('Error processing .env file:', error);
}
