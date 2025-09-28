---
 title: "Introducing the Lab"
 excerpt: "打造一個可以自助管理的個人站，連結內容、作品與匿名共創。"
 tags:
   - Personal Site
   - Workflow
 category: Narrative
 updatedAt: 2024-07-18T00:00:00.000Z
 externalUrl: ""
---

建立這個站點的目標，是把我日常的內容營運方式，完全建構在 git 與 static hosting 之上；雖然是靜態頁面，但透過 GitHub API 與 Cloudflare Workers，就能支援動態更新、匿名檔案共享，以及日後的前端實驗。

在這個第一篇文章中，我整理了整個架構的核心部件，以及接下來想要分享的主題：

1. **內容模型與 Markdown 流程** — 採用 front-matter 來定義文章屬性，方便在不同平台重用。
2. **Decap CMS** — 透過 GitHub OAuth 就能在瀏覽器上編輯，降低門檻。
3. **匿名檔案工作流** — 由 Cloudflare Worker 擔任安全的代理，協助寫入 GitHub Repo。

歡迎你透過匿名上傳區留下任何建議，或是關注日後的更新！
