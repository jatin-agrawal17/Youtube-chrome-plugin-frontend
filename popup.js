// popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");
  const API_KEY = 'Your_YouTube_API_Key_Here';
  const API_URL = 'http://localhost:5000';

  // ✅ Sentiment storage
  const sentimentMap = {
    positive: [],
    negative: [],
    neutral: []
  };

  let homeHTML = "";


  function exportToCSV(predictions, comments) {
  const headers = [
    "Index",
    "Comment",
    "Sentiment_Label",
    "Sentiment_Score",
    "Author_ID",
    "Timestamp"
  ];

  const rows = predictions.map((item, i) => {
    const sentimentLabel =
      item.sentiment == "1" ? "Positive" :
      item.sentiment == "-1" ? "Negative" :
      "Neutral";

    return [
      i + 1,
      `"${item.comment.replace(/"/g, '""')}"`, // escape quotes
      sentimentLabel,
      item.sentiment,
      comments[i]?.authorId || "Unknown",
      item.timestamp
    ];
  });

  let csvContent =
    headers.join(",") + "\n" +
    rows.map(r => r.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "youtube_comment_analysis.csv";
  a.click();

  URL.revokeObjectURL(url);
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "exportCsvBtn") {
    exportToCSV(window.latestPredictions, window.latestComments);
  }
});

document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "exportPdfBtn") {
    const res = await fetch(`${API_URL}/generate_pdf_report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(window.latestPdfPayload)
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "YouTube_Comment_Analysis_Report.pdf";
    a.click();

    URL.revokeObjectURL(url);
  }
});



  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0].url;
    const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
    const match = url.match(youtubeRegex);

    if (!match) {
      outputDiv.innerHTML = "<p>This is not a valid YouTube URL.</p>";
      return;
    }

    const videoId = match[1];
    outputDiv.innerHTML = `<div class="section-title">YouTube Video ID</div>
                           <p>${videoId}</p><p>Fetching comments...</p>`;

    const comments = await fetchComments(videoId);
    if (!comments.length) {
      outputDiv.innerHTML += "<p>No comments found.</p>";
      return;
    }

    outputDiv.innerHTML += `<p>Fetched ${comments.length} comments. Performing sentiment analysis...</p>`;
    const predictions = await getSentimentPredictions(comments);



    window.latestPredictions = predictions;
    window.latestComments = comments;





    if (!predictions) return;

    const sentimentCounts = { "1": 0, "0": 0, "-1": 0 };
    const sentimentData = [];
    const totalSentimentScore = predictions.reduce(
      (sum, item) => sum + parseInt(item.sentiment),
      0
    );

    // ================= 🔴 FIX START =================
    predictions.forEach((item) => {
      sentimentCounts[item.sentiment]++;
      sentimentData.push({
        timestamp: item.timestamp,
        sentiment: parseInt(item.sentiment)
      });

      // ✅ THIS WAS MISSING BEFORE
      if (item.sentiment == "1") {
        sentimentMap.positive.push(item.comment);
      } else if (item.sentiment == "-1") {
        sentimentMap.negative.push(item.comment);
      } else {
        sentimentMap.neutral.push(item.comment);
      }
    });

    // ✅ UPDATE COUNTS AFTER FILLING sentimentMap
    document.getElementById("positiveCount").textContent = sentimentMap.positive.length;
    document.getElementById("negativeCount").textContent = sentimentMap.negative.length;
    document.getElementById("neutralCount").textContent = sentimentMap.neutral.length;
    // ================= 🔴 FIX END =================

    const totalComments = comments.length;
    const uniqueCommenters = new Set(comments.map(c => c.authorId)).size;
    const totalWords = comments.reduce(
      (sum, c) => sum + c.text.split(/\s+/).filter(Boolean).length,
      0
    );
    const avgWordLength = (totalWords / totalComments).toFixed(2);
    const avgSentimentScore = (totalSentimentScore / totalComments).toFixed(2);
    const normalizedSentimentScore = (((+avgSentimentScore + 1) / 2) * 10).toFixed(2);

    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Comment Analysis Summary</div>
        <div class="metrics-container">
          <div class="metric"><div class="metric-title">Total Comments</div><div class="metric-value">${totalComments}</div></div>
          <div class="metric"><div class="metric-title">Unique Commenters</div><div class="metric-value">${uniqueCommenters}</div></div>
          <div class="metric"><div class="metric-title">Avg Comment Length</div><div class="metric-value">${avgWordLength} words</div></div>
          <div class="metric"><div class="metric-title">Avg Sentiment Score</div><div class="metric-value">${normalizedSentimentScore}/10</div></div>
        </div>
      </div>
    `;

    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Sentiment Analysis Results</div>
        <div id="chart-container"></div>
      </div>
    `;
    await fetchAndDisplayChart(sentimentCounts);

    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Sentiment Trend Over Time</div>
        <div id="trend-graph-container"></div>
      </div>
    `;
    await fetchAndDisplayTrendGraph(sentimentData);

    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Comment Wordcloud</div>
        <div id="wordcloud-container"></div>
      </div>
    `;
    await fetchAndDisplayWordCloud(comments.map(c => c.text));


    // 🔹 Top 25 Comments with Sentiments (added AFTER wordcloud)
    outputDiv.innerHTML += `
      <div class="section">
        <div class="section-title">Top 25 Comments with Sentiments</div>
        <ul class="comment-list">
          ${predictions.slice(0, 25).map((item, index) => `
            <li class="comment-item">
              <span>${index + 1}. ${item.comment}</span><br>
              <span class="comment-sentiment">Sentiment: ${item.sentiment}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `;

    // 🔹 Export CSV Button
    outputDiv.innerHTML += `
      <div class="section" style="text-align:center;">
        <button id="exportCsvBtn" style="
          background:#0099ff;
          color:#fff;
          border:none;
          padding:8px 12px;
          border-radius:4px;
          cursor:pointer;
          font-size:14px;
        ">
          Export Analysis as CSV
        </button>
      </div>
    `;

//     document.getElementById("exportCsvBtn").addEventListener("click", () => {
//   exportToCSV(predictions, comments);
// });


    outputDiv.innerHTML += `
  <div class="section" style="text-align:center;">
    <button id="exportPdfBtn" style="
      background:#e53935;
      color:#fff;
      border:none;
      padding:8px 12px;
      border-radius:4px;
      cursor:pointer;
      font-size:14px;
      margin-top:8px;
    ">
      Export Analysis Report (PDF)
    </button>
  </div>
`;

    // document.getElementById("exportPdfBtn").addEventListener("click", async () => {
    //   const payload = {
    //     summary: {
    //       totalComments,
    //       uniqueCommenters,
    //       avgWordLength,
    //       normalizedSentimentScore
    //     },
    //     sentimentCounts,
    //     sentimentSamples: {
    //       positive: sentimentMap.positive.slice(0, 10),
    //       negative: sentimentMap.negative.slice(0, 10),
    //       neutral: sentimentMap.neutral.slice(0, 10)
    //     }
    //   };

    //   const res = await fetch(`${API_URL}/generate_pdf_report`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(payload)
    //   });

    //   const blob = await res.blob();
    //   const url = URL.createObjectURL(blob);

    //   const a = document.createElement("a");
    //   a.href = url;
    //   a.download = "YouTube_Comment_Analysis_Report.pdf";
    //   a.click();

    //   URL.revokeObjectURL(url);
    // });
    window.latestPdfPayload = {
  summary: {
    totalComments,
    uniqueCommenters,
    avgWordLength,
    normalizedSentimentScore
  },
  sentimentCounts,
  sentimentSamples: {
    positive: sentimentMap.positive.slice(0, 10),
    negative: sentimentMap.negative.slice(0, 10),
    neutral: sentimentMap.neutral.slice(0, 10)
  }
};




    homeHTML = outputDiv.innerHTML;
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".sentiment-btn");
    if (!btn) return;
    renderTopSentimentComments(btn.dataset.type);
  });

  function renderTopSentimentComments(type) {
    outputDiv.innerHTML = `
      <div id="backArrow" title="Back" style="
        font-size:18px;
        cursor:pointer;
        margin-bottom:8px;
        width:fit-content;
      ">&larr;</div>


      <div class="section-title">
        Top ${Math.min(30, sentimentMap[type].length)} ${type} comments
      </div>
    `;

    const ul = document.createElement("ul");
    ul.className = "comment-list";

    sentimentMap[type].slice(0, 30).forEach((text, i) => {
      const li = document.createElement("li");
      li.className = "comment-item";
      li.innerText = `${i + 1}. ${text}`;
      ul.appendChild(li);
    });

    outputDiv.appendChild(ul);

    // ⬅️ Back arrow logic
    document.getElementById("backArrow").addEventListener("click", () => {
      outputDiv.innerHTML = homeHTML;
    });
  }


  // ================= FUNCTIONS =================

  async function fetchComments(videoId) {
    let comments = [];
    let pageToken = "";
    while (comments.length < 500) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&pageToken=${pageToken}&key=${API_KEY}`
      );
      const data = await res.json();
      if (!data.items) break;

      data.items.forEach(item => {
        comments.push({
          text: item.snippet.topLevelComment.snippet.textOriginal,
          timestamp: item.snippet.topLevelComment.snippet.publishedAt,
          authorId: item.snippet.topLevelComment.snippet.authorChannelId?.value || "Unknown"
        });
      });

      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return comments;
  }

  async function getSentimentPredictions(comments) {
    const res = await fetch(`${API_URL}/predict_with_timestamps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments })
    });
    return await res.json();
  }

  async function fetchAndDisplayChart(data) {
    const res = await fetch(`${API_URL}/generate_chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentiment_counts: data })
    });
    const img = document.createElement("img");
    img.src = URL.createObjectURL(await res.blob());
    document.getElementById("chart-container").appendChild(img);
  }

  async function fetchAndDisplayTrendGraph(data) {
    const res = await fetch(`${API_URL}/generate_trend_graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentiment_data: data })
    });
    const img = document.createElement("img");
    img.src = URL.createObjectURL(await res.blob());
    document.getElementById("trend-graph-container").appendChild(img);
  }

  async function fetchAndDisplayWordCloud(data) {
    const res = await fetch(`${API_URL}/generate_wordcloud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: data })
    });
    const img = document.createElement("img");
    img.src = URL.createObjectURL(await res.blob());
    document.getElementById("wordcloud-container").appendChild(img);
  }
});
