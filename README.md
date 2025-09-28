# Flux Paste Hub

一個個人用的「文字 / 小檔案」儲存與分享實驗專案。它示範：前端單頁 (Vue) + Cloudflare Worker 代理 + Git Repository 當簡易內容儲存層。

> 注意：這個倉庫不是「模板」；想自行部署請前往模板專案。（不要 Fork / Clone 本倉庫來自架。）

## 功能概述
* 上傳純文字或小型檔案，存成 Git repo 內的檔案（具歷史）
* 透過 Worker API 取得列表 / 刪除
* （個人用途）不含帳號系統、權限控管簡化

## 架構簡述
前端 -> 呼叫 Cloudflare Worker -> Worker 以 GitHub API 寫入/讀取 repo 內容。

## 自行部署請前往
➡️ 模板倉庫（完整教學、指令、範例程式）: https://github.com/changrun1/file-share

該模板會包含：
1. 最小前端 + API 呼叫封裝
2. Worker 完整上傳 / 列表 / 刪除實作
3. GitHub Pages / Cloudflare 部署流程
4. 常見錯誤排查與 Checklist

## 線上示例
Demo（若已開放）: https://changrun1.github.io/

## 為什麼不直接 Fork 這裡？
此倉庫包含個人調整與可能的過時片段；集中維護於新模板能避免他人被歷史雜訊干擾。

## 授權
MIT

---
有需求 / 問題：請到模板倉庫開 issue（這裡不受理自架支援）。

