# HeartTalk AI

AI 虛擬女朋友陪伴與溝通練習網站。

副標題：陪你聊天，也陪你慢慢學會與人靠近。

## 功能

- React 18 + Vite + Tailwind CSS
- WhatsApp / LINE / iMessage 風格聊天介面
- 虛擬女朋友陪伴模式
- 普通聊天、曖昧陪伴、虛擬女朋友、深夜陪伴、溝通練習模式
- AI 主動訊息模擬
- 情緒狀態與 Avatar 變化
- 關係進度系統
- 本地記憶功能 localStorage
- PWA manifest + service worker
- Vercel OpenAI API route `/api/chat`
- 無 OpenAI API Key 時會自動使用本地陪伴回覆，不會白屏

## 本機安裝

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## 部署到 Vercel

1. 將整個資料夾上傳到 GitHub。
2. 到 Vercel 匯入 Repository。
3. Build Command 使用：

```bash
npm run build
```

4. Output Directory 使用：

```bash
dist
```

5. 如要使用真正 OpenAI API，在 Vercel Project Settings → Environment Variables 加入：

```bash
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4o-mini
```

> 注意：API Key 只放在 Vercel 環境變數，不要放在前端程式碼。

## 部署到 GitHub Pages

GitHub Pages 可部署前端靜態版，但不能執行 `/api/chat` serverless route。網站會自動使用本地 AI 陪伴回覆。

```bash
npm run build
```

然後將 `dist` 發佈到 GitHub Pages。

## 重要安全定位

本網站定位是「陪伴與溝通練習」，不是取代真人關係，也不是專業心理治療。如用戶出現自傷或危機內容，系統會提示尋求真人與緊急支援。
