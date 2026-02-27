const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
    console.error("❌ YOUTUBE_API_KEY is missing in .env");
    process.exit(1);
}

console.log(`Checking YouTube API Key...`);

const query = "React JS Tutorial";
const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        let output = "";
        if (res.statusCode === 200) {
            const json = JSON.parse(data);
            if (json.items && json.items.length > 0) {
                output += "✅ YouTube API is working!\n";
                output += "   Found video: " + json.items[0].snippet.title + "\n";
            } else {
                output += "⚠️ YouTube API returned no results (but request succeeded).\n";
            }
        } else {
            output += `❌ YouTube API execution failed. Status: ${res.statusCode}\n`;
            output += "   Response: " + data + "\n";
        }
        console.log(output);
        const fs = require('fs');
        fs.writeFileSync(path.join(__dirname, '..', 'youtube_result.txt'), output, 'utf8');
    });

}).on("error", (err) => {
    console.error("❌ Network error:", err.message);
});
