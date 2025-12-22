document.addEventListener("DOMContentLoaded", async () => {
    const outputDiv = document.getElementById("output");

    // const API_KEY = ;
    const SENTIMENT_API_URL = "http://127.0.0.1:5000/predict";

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].url) {
            outputDiv.textContent = "Unable to read current tab URL.";
            return;
        }

        const url = tabs[0].url;

        // Validate YouTube URL
        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex);

        if (!match || !match[1]) {
            outputDiv.textContent = "This is not a valid YouTube video page.";
            return;
        }

        const videoId = match[1];
        outputDiv.textContent = `YouTube Video ID: ${videoId}\nFetching comments...`;

        // Fetch comments safely
        const comments = await fetchCommentsSafe(videoId, API_KEY);

        if (comments === null) {
            outputDiv.textContent +=
                "\n⚠️ Comments exist but are NOT accessible via YouTube API.";
            return;
        }

        if (comments.length === 0) {
            outputDiv.textContent += "\nNo comments found for this video.";
            return;
        }

        outputDiv.textContent +=
            `\nFetched ${comments.length} comments.\nAnalyzing sentiment...`;

        // Send to sentiment API
        const predictions = await getSentimentPredictions(comments, SENTIMENT_API_URL);

        if (!predictions || predictions.length === 0) {
            outputDiv.textContent += "\nSentiment analysis failed.";
            return;
        }

        // Calculate sentiment distribution
        const sentimentCounts = { "1": 0, "0": 0, "-1": 0 };
        predictions.forEach(p => sentimentCounts[p]++);

        const total = predictions.length;

        outputDiv.textContent += `

Sentiment Distribution:
Positive (1): ${((sentimentCounts["1"] / total) * 100).toFixed(2)}%
Neutral (0): ${((sentimentCounts["0"] / total) * 100).toFixed(2)}%
Negative (-1): ${((sentimentCounts["-1"] / total) * 100).toFixed(2)}%
        `;
    });
});


async function fetchCommentsSafe(videoId, API_KEY) {
    let comments = [];
    let pageToken = "";

    try {
        while (comments.length < 100) {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/commentThreads` +
                `?part=snippet` +
                `&videoId=${videoId}` +
                `&maxResults=50` +
                `&order=relevance` +
                `&textFormat=plainText` +
                `&pageToken=${pageToken}` +
                `&key=${API_KEY}`
            );

            const data = await response.json();

            // 🚨 API-level restriction or error
            if (data.error) {
                console.error("YouTube API error:", data.error);
                return null; // comments exist but blocked
            }

            if (!data.items || data.items.length === 0) {
                break;
            }

            data.items.forEach(item => {
                const text =
                    item?.snippet?.topLevelComment?.snippet?.textOriginal;
                if (text) comments.push(text);
            });

            pageToken = data.nextPageToken;
            if (!pageToken) break;
        }
    } catch (err) {
        console.error("Comment fetch failed:", err);
        return null;
    }

    return comments;
}


async function getSentimentPredictions(comments, API_URL) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comments })
        });

        if (!response.ok) {
            console.error("Sentiment API failed:", response.status);
            return null;
        }

        const result = await response.json();
        return result.map(item => item.sentiment);
    } catch (error) {
        console.error("Sentiment request error:", error);
        return null;
    }
}
