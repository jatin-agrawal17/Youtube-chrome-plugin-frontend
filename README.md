# YouTube Comment Sentiment Analysis – Chrome Extension (Frontend)

This repository contains the **frontend Chrome Extension** for the YouTube Comment Sentiment Analysis project.  
The extension integrates with a backend ML inference API to provide **real-time sentiment insights** on YouTube comments.

---

## 🚀 Features

- Analyze YouTube video comments directly from the browser
- Display sentiment classification:
  - **Positive**
  - **Neutral**
  - **Negative**
- Visual insights:
  - Sentiment distribution
  - Trend tracking
  - Word cloud
- Summary statistics:
  - Average comment length
  - Average sentiment score
  - Total comments
  - Unique comments
- Export detailed analysis as **CSV / PDF**

---

## 🧩 Tech Stack

- **JavaScript**
- **HTML**
- **CSS**
- **Chrome Extension APIs**
---

## 🔗 Backend Integration

- The extension communicates with a **Flask-based ML inference API**
- The backend is part of a separate **MLOps repository**
- API URL is configured inside the frontend code

> ⚠️ API keys (e.g., Gemini API key) **not committed** for security reasons.

---

## 🛠️ How to Use

1. Clone this repository
2. Open **Chrome → Extensions**
3. Enable **Developer Mode**
4. Click **Load Unpacked**
5. Select the project folder
6. Open any YouTube video and use the extension

---

## 📌 Note

This frontend is part of a **larger end-to-end MLOps project** involving:
- MLflow experimentation
- DVC pipelines
- CI/CD with GitHub Actions
- Dockerized backend
- AWS deployment (currently offline due to free-tier expiry)

---

## 🙌 Acknowledgements

- Chrome Extension Documentation
- Open-source ML & MLOps community

---

