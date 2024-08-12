const express = require('express');
const axios = require('axios');
const { Parser } = require('json2csv');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/submit', async (req, res) => {
    try {
        const { query } = req.body;
        console.log(query)
        if (!query.startsWith('https://www.instagram.com')) {
            return res.status(400).send('Invalid Instagram URL. The URL must start with https://www.instagram.com');
        }

        const apiResponse = await axios.post('https://api.apify.com/v2/acts/apify~instagram-comment-scraper/run-sync-get-dataset-items?token=apify_api_6EstQzCpIIWftvu8MuRw3rClNs0NdO3y8uoa', {
            directUrls: [query],
            resultsLimit: 50
        });

        const filteredData = apiResponse.data.map(item => ({
            timestamp: item.timestamp,
            ownerUsername: item.ownerUsername,
            text: item.text
        }));
        const csvData = apiResponse.data.map(item => ({
            Username: item.ownerUsername,
        }));

        const parser = new Parser();
        const csv = parser.parse(csvData);

        const timestampWithTimezone = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const timestampWithoutSpaces = timestampWithTimezone.replace(/\s+/g, '');
        const filename = `comments_${timestampWithoutSpaces}.csv`;

        // Render HTML response
        const htmlResponse = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Instagram Comments Results</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background-color: #f0f4f8;
                        display: flex;
                        justify-content: center;
                        padding: 2rem;
                        margin: 0;
                    }
                    .container {
                        background-color: white;
                        padding: 2rem;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        width: 100%;
                        max-width: 800px;
                    }
                    h1 {
                        color: #2d3748;
                        margin-bottom: 1.5rem;
                        text-align: center;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 2rem;
                    }
                    th, td {
                        border: 1px solid #e2e8f0;
                        padding: 0.75rem;
                        text-align: left;
                    }
                    th {
                        background-color: #4299e1;
                        color: white;
                    }
                    tr:nth-child(even) {
                        background-color: #f8fafc;
                    }
                    .download-link {
                        display: block;
                        text-align: center;
                        margin-top: 1rem;
                        color: #4299e1;
                        text-decoration: none;
                        padding: 0.5rem 1rem;
                        border: 2px solid #4299e1;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                    }
                    .download-link:hover {
                        background-color: #4299e1;
                        color: white;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Instagram Comments Results</h1>
                    <a href="data:text/csv;charset=utf-8,${encodeURIComponent(csv)}" download="${filename}" class="download-link">Download CSV</a>
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Owner Username</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredData.map(item => `
                                <tr>
                                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                                    <td>${item.ownerUsername}</td>
                                    <td>${item.text}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;

        res.send(htmlResponse);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred while fetching data from the API');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});