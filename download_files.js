const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = {
    username: 'admin',
    password: 'admin',
    url: 'https://the-internet.herokuapp.com/download_secure',
    downloadDir: path.join(__dirname, 'downloads')
};

async function downloadFiles() {
    try {
        // Create downloads directory if it doesn't exist
        if (!fs.existsSync(config.downloadDir)) {
            fs.mkdirSync(config.downloadDir, { recursive: true });
        }

        console.log(`Connecting to ${config.url}...`);

        // 1. Get the page content
        const response = await axios.get(config.url, {
            auth: {
                username: config.username,
                password: config.password
            }
        });

        // 2. Extract filenames using regex (looking for href="download_secure/...")
        const html = response.data;
        const fileMatches = html.matchAll(/href="download_secure\/([^"]+)"/g);
        const fileNames = [...fileMatches].map(match => match[1]);

        console.log(`Found ${fileNames.length} files. Starting download...`);

        // 3. Select one random file
        if (fileNames.length === 0) {
            console.log('No files found to download.');
            return;
        }

        const randomIndex = Math.floor(Math.random() * fileNames.length);
        const fileName = fileNames[randomIndex];
        console.log(`Selected random file: ${fileName}`);

        // 4. Download the selected file
        const fileUrl = `${config.url}/${encodeURIComponent(fileName)}`;
        const filePath = path.join(config.downloadDir, fileName);

        console.log(`Downloading: ${fileName}...`);

        const fileResponse = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream',
            auth: {
                username: config.username,
                password: config.password
            }
        });

        const writer = fs.createWriteStream(filePath);
        fileResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`✅ Random download completed: ${fileName}`);
        console.log(`File saved in: ${config.downloadDir}`);

    } catch (error) {
        console.error('❌ Error occurred:', error.message);
    }
}

downloadFiles();
