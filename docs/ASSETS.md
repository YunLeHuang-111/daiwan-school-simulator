# 視覺素材紀錄

本版2026-11-10。首頁作者標示LeleHuang。

## 校園主圖

- 生成模式：內建 `image_gen.imagegen`，文字生成新圖，不使用參考圖。
- 專案檔案：`web/assets/campus-summer-v4.png`，1536×1024。
- 實際提示：

> Use case: illustration-story. Asset: wide 3:2 website hero image. A beautiful hand-painted anime background of a fictional Taiwanese senior high school courtyard in summer: red-brick and cream classroom buildings, green windows and corridor, basketball court and running-track edge, tropical trees, blue sky and fluffy clouds. A few small high school students in modest white uniforms with backpacks walking together. Vivid emerald, yellow, coral and sky blue, cinematic sunny light, rich textures, inviting youthful mood. Architectural detail to the right and center, clear sky upper left. No UI, text, signs, logos or watermark. Not a specific real campus.

主圖為虛構校園，不是指定真實學校的照片。

## 原創向量與介面

- `web/assets/crests/`：25個SVG校徽，各校獨立配色與圖形，不含英文文字；以山、書、原子、建築、醫療、藝術等意象構成，不複製官方標誌。
- `web/assets/scenes/`：圖書館、舞臺、實驗室、球場、雨天、屋頂六張SVG校園插圖，以程式繪製。
- `web/assets/avatar-male.svg`、`avatar-female.svg`：依角色性別顯示的原創制服人像。`avatar-default.svg`保留供舊版參照。玩家上傳照片在瀏覽器內裁切為320×400 JPEG，不傳至伺服器。
- 品牌遊戲僅用色塊陣列，沒有官方商標圖片。動漫與影視配對採角色／作品文字，不使用劇照或角色圖。
- CSS繪製稿紙格線、骰子、選單、學生證與卡片；介面使用系統字型，沒有第三方字型下載。

學生證以諧音校名、原創徽章與遊戲紀念字樣呈現，不沿用真實學生證樣式。舊版未使用資產可能仍留在專案內供歷史參照，遊戲只引用本版清單。
