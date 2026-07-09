# MAYKI UC BOT 24/7 VIP

Telegram bot project for **@Mayki_UC_bot** with:

- Welcome image.
- Russian / English language switch.
- Telegram Mini App button connected to: `https://bir54phb-production.up.railway.app`
- PUBG UC product flow with cart.
- Prime Plus products.
- Disabled payment flow with message: bot development/payment setup not completed yet.
- Admin panel commands similar to MD STORE.
- Owner-only admin management.
- Persistent JSON storage.
- Railway-ready deployment.

## 1. Upload to GitHub

Upload the **contents** of this folder to your GitHub repository, not the folder itself.

Correct GitHub structure:

```text
package.json
src/
data/
assets/
README.md
railway.json
nixpacks.toml
.env.example
```

## 2. Railway Variables

In Railway, open your service → Variables and add:

```env
BOT_TOKEN=YOUR_BOTFATHER_TOKEN
OWNER_ID=8573174269
MINI_APP_URL=https://bir54phb-production.up.railway.app
BOT_NAME=MAYKI UC BOT 24/7 VIP
BOT_USERNAME=@Mayki_UC_bot
SUPPORT_URL=https://t.me/Mayki_UC_manager
CHANNEL_URL=https://t.me/Mayki_uc_shop
```

Do **not** upload your real `.env` file to GitHub.

## 3. Deploy

Railway should detect Node.js and run:

```bash
npm install
npm start
```

The bot uses long polling. Do not run the same bot token in multiple places at the same time.

## 4. Important Telegram note about button colors

Telegram Bot API does **not** allow bots to force exact colors for normal reply keyboard buttons. The button colors are controlled by Telegram app/theme. This project uses emojis, text layout, and Web App buttons to make the UI similar to the examples.

## 5. Mini App link

The bot opens the Mini App using:

```text
https://bir54phb-production.up.railway.app
```

The Mini App itself must verify Telegram `initData` using the bot token. The bot already sends users through Telegram WebApp buttons.

## 6. Custom emoji IDs saved in the project

- UC / money icon: `5334569747814055421`
- Mini App / opening button icon: `5280826864988873394`
- Prime / premium icon: `5978787401667972422`

## 7. Owner

Owner ID:

```text
8573174269
```

Only owner can add/remove admins.
