---
 title: "Content Ops Blueprint"
 excerpt: "以 GitHub + Vue 打造內容營運自動化的藍圖，涵蓋版本控管、審稿與發佈流程。"
 tags:
   - ContentOps
   - Automation
 category: Playbook
 updatedAt: 2024-08-12T00:00:00.000Z
 externalUrl: ""
---

內容營運的關鍵，在於讓「製作」與「發佈」維持一致的語言與節奏。透過 GitHub 作為單一真實來源（Single Source of Truth），每一則文章、作品、檔案都能自動版本化，並搭配 Decap CMS 形成簡潔的編輯介面。

這篇藍圖介紹了：

- 如何設計內容資料夾結構與 metadata。
- 使用 GitHub Actions 驗證 Markdown 的格式。
- 以 Cloudflare Worker 產生 Pull Request，導入匿名投稿。

最終，我們可以把內容視為 API 的一種，讓任何前端裝置都能消費這些資料。
