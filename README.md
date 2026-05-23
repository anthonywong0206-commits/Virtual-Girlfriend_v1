# HeartTalk AI - OpenAI Connected Version

AI 虛擬女朋友聊天網站，支援 Vercel 部署及真正 OpenAI API 回覆。

## 重要說明

如果沒有設定 `OPENAI_API_KEY`，網站會自動使用本地模擬回覆，所以你會覺得「未連到 AI」。

真正 AI 只會在 Vercel / Node server 環境中透過 `/api/chat` 運作。

GitHub Pages 是純靜態網站，不能安全存放 OpenAI API Key，也不能執行 `/api/chat` server route。
如要真正連 AI，請用 Vercel 部署。

## 本次修復

- 修復 Vite 5 與 @vitejs/plugin-react 版本衝突
- 加入 Vercel `/api/chat` OpenAI route
- API Key 不會暴露在前端
- 更新 AI prompt：真正女朋友感、樂觀、愛分享、會關心人
- 弱化「溝通練習」身份
- 沒有 API Key 時會 fallback 到本地回覆

## Vercel 設定方法

1. 將整個專案上傳 GitHub
2. Vercel Import Project
3. 到 Vercel：
   Project Settings > Environment Variables
4. 新增：

```env
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4o-mini
```

5. Redeploy

## 本地測試

```bash
npm install
npm run dev
```

注意：本地 Vite dev server 不一定會執行 Vercel `/api/chat`。
最準確測試方法是部署到 Vercel 後測試。

## 如果仍然像本地回覆

請檢查：

- Vercel 是否已加入 `OPENAI_API_KEY`
- 是否 Redeploy
- Vercel Function Logs 有沒有 `OPENAI_API_KEY not configured`
- GitHub Pages 版本不能真正連 AI
