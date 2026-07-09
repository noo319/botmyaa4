import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { Telegraf } from 'telegraf';
import { ROOT, readJson, writeJson, nowIso } from './storage.js';
import { tr, CUSTOM } from './i18n.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID || 8573174269);
const PORT = Number(process.env.PORT || 3000);
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://bir54phb-production.up.railway.app';
const BOT_NAME = process.env.BOT_NAME || 'MAYKI UC BOT 24/7 VIP';
const BOT_USERNAME = process.env.BOT_USERNAME || '@Mayki_UC_bot';
const SUPPORT_URL = process.env.SUPPORT_URL || 'https://t.me/Mayki_UC_manager';
const CHANNEL_URL = process.env.CHANNEL_URL || 'https://t.me/Mayki_uc_shop';
const WELCOME_IMAGE = path.join(ROOT, 'assets', 'welcome.jpeg');

const EMOJI = {
  app: '5280826864988873394',
  uc: '5334569747814055421',
  prime: '5978787401667972422',
  support: '5332531536723984111',
  channel: '5852684155380304970',
  lang: '5895592588064328942'
};

// Telegram premium emoji inside messages (HTML parse mode).
function tgEmoji(id, fallback) {
  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
}

// Raw inline buttons: keeps web_app/url/callback_data, and passes the new style/icon_custom_emoji_id fields directly.
// If a Telegram client/API ignores style, the button still works normally.
function btn(text, data = {}) {
  return { text, ...data };
}
function cb(text, callback_data, style = 'primary', icon_custom_emoji_id = undefined) {
  return btn(text, { callback_data, style, ...(icon_custom_emoji_id ? { icon_custom_emoji_id } : {}) });
}
function urlBtn(text, url, style = 'primary', icon_custom_emoji_id = undefined) {
  return btn(text, { url, style, ...(icon_custom_emoji_id ? { icon_custom_emoji_id } : {}) });
}
function webBtn(text, url, style = 'primary', icon_custom_emoji_id = undefined) {
  return btn(text, { web_app: { url }, style, ...(icon_custom_emoji_id ? { icon_custom_emoji_id } : {}) });
}
function inlineKeyboard(inline_keyboard) {
  return { reply_markup: { inline_keyboard } };
}


if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is missing. Add it to Railway Variables or .env');
  process.exit(1);
}

const cfg = { miniAppUrl: MINI_APP_URL, botName: BOT_NAME, botUsername: BOT_USERNAME, supportUrl: SUPPORT_URL, channelUrl: CHANNEL_URL };
const bot = new Telegraf(BOT_TOKEN);
const sessions = new Map();

const data = {
  users: () => readJson('users.json', {}),
  saveUsers: (x) => writeJson('users.json', x),
  products: () => readJson('products.json', { pubg_uc: [], prime_plus: [], payments: ['СБП', 'Банковские карты РФ', 'USDT'] }),
  saveProducts: (x) => writeJson('products.json', x),
  orders: () => readJson('orders.json', []),
  saveOrders: (x) => writeJson('orders.json', x),
  admins: () => readJson('admins.json', { admins: [OWNER_ID] }),
  saveAdmins: (x) => writeJson('admins.json', x),
  coupons: () => readJson('coupons.json', {}),
  saveCoupons: (x) => writeJson('coupons.json', x),
  settings: () => readJson('settings.json', { discount24: 0, gameRate: 100, codeRate: 100, rates: {} }),
  saveSettings: (x) => writeJson('settings.json', x)
};

function rub(n) { return `${Number(n || 0).toLocaleString('ru-RU')}₽`; }
function uid(ctx) { return ctx.from?.id; }
function langOf(ctx) { return ensureUser(ctx).lang || 'ru'; }
function isAdminId(id) {
  if (Number(id) === OWNER_ID) return true;
  const admins = data.admins().admins || [];
  return admins.map(Number).includes(Number(id));
}
function adminOnly(ctx) {
  if (!isAdminId(uid(ctx))) {
    ctx.reply(tr(langOf(ctx), 'adminOnly'));
    return false;
  }
  return true;
}
function ensureUser(ctx) {
  const id = uid(ctx);
  const users = data.users();
  if (!users[id]) {
    users[id] = {
      id,
      username: ctx.from?.username || '',
      firstName: ctx.from?.first_name || 'MAYKI User',
      lastName: ctx.from?.last_name || '',
      lang: ctx.from?.language_code?.startsWith('en') ? 'en' : 'ru',
      balanceRub: 0,
      minAmount: null,
      banned: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  } else {
    users[id].username = ctx.from?.username || users[id].username || '';
    users[id].firstName = ctx.from?.first_name || users[id].firstName || 'MAYKI User';
    users[id].lastName = ctx.from?.last_name || users[id].lastName || '';
    users[id].updatedAt = nowIso();
  }
  data.saveUsers(users);
  return users[id];
}
function updateUser(id, patch) {
  const users = data.users();
  users[id] = { ...(users[id] || { id }), ...patch, updatedAt: nowIso() };
  data.saveUsers(users);
  return users[id];
}


/*
  MAYKI UI:
  - No bottom Reply Keyboard.
  - All buttons are Inline Keyboard buttons under the message/photo.
  - Buttons include Telegram premium custom emoji IDs and requested style fields.
*/

function mainInlineKeyboard(lang = 'ru') {
  return inlineKeyboard([
    [webBtn(`💝 ${tr(lang, 'openApp')}`, MINI_APP_URL, 'danger', EMOJI.app)],
    [cb(`💰 ${tr(lang, 'buyUc')}`, 'menu:uc', 'primary', EMOJI.uc)],
    [
      cb(`⭐ ${tr(lang, 'prime')}`, 'menu:prime', 'success', EMOJI.prime),
      cb(tr(lang, 'info'), 'menu:info', 'primary')
    ],
    [
      urlBtn(`📞 ${tr(lang, 'support')}`, SUPPORT_URL, 'danger', EMOJI.support),
      urlBtn(`⭐ ${tr(lang, 'channel')}`, CHANNEL_URL, 'success', EMOJI.channel)
    ],
    [cb(`⚙️ ${tr(lang, 'lang')}`, 'menu:language', 'primary', EMOJI.lang)]
  ]);
}
function inlineSiteButtons(lang = 'ru') {
  return inlineKeyboard([
    [webBtn(`💝 ${tr(lang, 'openApp')}`, MINI_APP_URL, 'danger', EMOJI.app)],
    [
      urlBtn(`⭐ ${tr(lang, 'channel')}`, CHANNEL_URL, 'success', EMOJI.channel),
      urlBtn(`📞 ${tr(lang, 'support')}`, SUPPORT_URL, 'danger', EMOJI.support)
    ],
    [cb(tr(lang, 'home'), 'menu:home', 'primary')]
  ]);
}
function homeInline(lang = 'ru') {
  return inlineKeyboard([[cb(tr(lang, 'home'), 'menu:home', 'primary')]]);
}
function cancelInline(lang = 'ru') {
  return inlineKeyboard([
    [cb(tr(lang, 'cancel'), 'cancel', 'danger')],
    [cb(tr(lang, 'home'), 'menu:home', 'primary')]
  ]);
}


async function sendWelcome(ctx) {
  const user = ensureUser(ctx);
  const lang = user.lang;
  const caption = `<b>${tr(lang, 'welcome', user.firstName)}</b>\n\n${tgEmoji(EMOJI.app, '💝')} <b>${BOT_NAME}</b>\n${tgEmoji(EMOJI.uc, '💰')} <b>Premium PUBG Mobile Store</b>`;
  const extra = { caption, parse_mode: 'HTML', ...mainInlineKeyboard(lang) };
  if (fs.existsSync(WELCOME_IMAGE)) {
    await ctx.replyWithPhoto({ source: WELCOME_IMAGE }, extra);
  } else {
    await ctx.reply(caption, { parse_mode: 'HTML', ...mainInlineKeyboard(lang) });
  }
}

function getSession(ctx) {
  const id = uid(ctx);
  if (!sessions.has(id)) sessions.set(id, { mode: null, cart: {}, pubgId: null, primeTarget: null, payment: null, orderType: null });
  return sessions.get(id);
}
function resetSession(ctx) { sessions.set(uid(ctx), { mode: null, cart: {}, pubgId: null, primeTarget: null, payment: null, orderType: null }); }
function cartItems(s) { return Object.values(s.cart || {}).filter(x => x.qty > 0); }
function cartUc(s) { return cartItems(s).reduce((a, x) => a + (x.amount || 0) * x.qty, 0); }
function cartTotal(s) { return cartItems(s).reduce((a, x) => a + (x.priceRub || 0) * x.qty, 0); }
function addToCart(s, p, qty = 1) {
  if (!p) return;
  const row = s.cart[p.id] || { ...p, qty: 0 };
  row.qty = Math.max(0, row.qty + qty);
  s.cart[p.id] = row;
  if (row.qty <= 0) delete s.cart[p.id];
}
function findProduct(id) {
  const p = data.products();
  return [...(p.pubg_uc || []), ...(p.prime_plus || [])].find(x => x.id === id);
}

async function editOrReply(ctx, text, markup, options = {}) {
  const payload = { parse_mode: 'HTML', ...options, ...(markup || {}) };
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, payload);
      return;
    } catch {
      try {
        await ctx.editMessageCaption(text, payload);
        return;
      } catch {
        try {
          await ctx.editMessageReplyMarkup(payload.reply_markup);
          await ctx.reply(text, payload);
          return;
        } catch {
          // Fallback below.
        }
      }
    }
  }
  await ctx.reply(text, payload);
}

async function showMain(ctx) {
  const lang = langOf(ctx);
  await editOrReply(ctx, `🏠 <b>${tr(lang, 'main')}</b>\n\n${tgEmoji(EMOJI.app, '💝')} <b>${BOT_NAME}</b>`, mainInlineKeyboard(lang));
}

async function showUcMethod(ctx) {
  const lang = langOf(ctx);
  resetSession(ctx);
  getSession(ctx).orderType = 'uc';
  await editOrReply(ctx, `<b>${tr(lang, 'chooseUcWay')}</b>`, inlineKeyboard([
    [cb(tr(lang, 'byId'), 'uc:by_id', 'primary', EMOJI.uc)],
    [cb(tr(lang, 'byCode'), 'uc:by_code', 'danger', EMOJI.uc)],
    [cb(tr(lang, 'cancel'), 'cancel', 'danger')]
  ]));
}

async function showUcCart(ctx) {
  const lang = langOf(ctx);
  const s = getSession(ctx);
  s.mode = 'uc_cart';
  s.orderType = 'uc';
  const products = data.products().pubg_uc || [];
  const rows = products.filter(p => p.active !== false).map(p => {
    const q = s.cart[p.id]?.qty || 0;
    if (q > 0) {
      return [
        cb(`💰 ${p.title} (${q}) - ${rub(p.priceRub)}`, `uc:add:${p.id}`, 'primary', EMOJI.uc),
        cb(`${lang === 'ru' ? 'Удалить' : 'Remove'}`, `uc:remove:${p.id}`, 'danger')
      ];
    }
    return [cb(`💰 ${p.title} - ${rub(p.priceRub)}`, `uc:add:${p.id}`, 'primary', EMOJI.uc)];
  });
  rows.push([cb(tr(lang, 'customAmount'), 'uc:custom', 'primary')]);
  rows.push([cb(tr(lang, 'checkout'), 'checkout', 'success')]);
  rows.push([cb(tr(lang, 'clearCart'), 'cart:clear', 'danger'), cb(tr(lang, 'home'), 'menu:home', 'primary')]);

  const text = `🛒 <b>${tr(lang, 'cart')}:</b>\n\n• ${tr(lang, 'totalUc')}: <b>${cartUc(s)} UC</b>\n• ${tr(lang, 'total')}: <b>${rub(cartTotal(s))}</b>\n\n<b>${tr(lang, 'chooseProducts')}</b>`;
  await editOrReply(ctx, text, inlineKeyboard(rows));
}

async function showPrime(ctx) {
  const lang = langOf(ctx);
  resetSession(ctx);
  getSession(ctx).orderType = 'prime';

  const rows = (data.products().prime_plus || [])
    .filter(p => p.active !== false)
    .map(p => [cb(`💰 ${p.title} - ${rub(p.priceRub)}`, `prime:select:${p.id}`, 'success', EMOJI.prime)]);

  rows.push([cb(tr(lang, 'home'), 'menu:home', 'primary')]);
  const text = `${tgEmoji(EMOJI.prime, '🟠')} <b>${tr(lang, 'primeTitle')}</b>\n\n<b>${lang === 'ru' ? 'АКТИВАЦИЯ ПО USERNAME / TELEGRAM ID' : 'ACTIVATION BY USERNAME / TELEGRAM ID'}</b>`;
  await editOrReply(ctx, text, inlineKeyboard(rows));
}

async function askPrimeTarget(ctx, productId) {
  const lang = langOf(ctx);
  const s = getSession(ctx);
  const product = findProduct(productId);
  if (!product) return ctx.reply(lang === 'ru' ? 'Товар не найден.' : 'Product not found.', homeInline(lang));
  s.cart = {};
  addToCart(s, product, 1);
  s.orderType = 'prime';
  s.mode = 'await_prime_target';
  const text = lang === 'ru'
    ? `⭐ <b>${product.title}</b>\n\nВведите Telegram username или Telegram ID аккаунта для активации.\n\nПример: <code>@username</code> или <code>8573174269</code>`
    : `⭐ <b>${product.title}</b>\n\nEnter Telegram username or Telegram ID for activation.\n\nExample: <code>@username</code> or <code>8573174269</code>`;
  await editOrReply(ctx, text, cancelInline(lang));
}

async function confirmOrder(ctx) {
  const lang = langOf(ctx);
  const s = getSession(ctx);
  if (!cartItems(s).length) return ctx.reply(tr(lang, 'empty') || 'Empty', homeInline(lang));

  const hasPrime = cartItems(s).some(x => x.category === 'prime_plus');
  const hasUc = cartItems(s).some(x => x.category === 'pubg_uc');

  if (hasPrime && !s.primeTarget) {
    s.mode = 'await_prime_target';
    return editOrReply(ctx,
      lang === 'ru'
        ? `✅ <b>Введите Telegram username или Telegram ID аккаунта:</b>`
        : `✅ <b>Enter Telegram username or Telegram ID:</b>`,
      cancelInline(lang)
    );
  }

  if (hasUc && !s.pubgId) {
    s.mode = 'await_pubg_id';
    return editOrReply(ctx, `✅ <b>${tr(lang, 'enterPubgId')}</b>`, cancelInline(lang));
  }

  const lines = cartItems(s).map(x => `- ${x.title} × ${x.qty}`).join('\n');
  const total = cartTotal(s);
  const targetLine = hasPrime
    ? `\n\nTelegram: <code>${s.primeTarget}</code>`
    : hasUc
      ? `\n\nPUBG ID: <code>${s.pubgId}</code>`
      : '';

  const text = `✅ <b>${tr(lang, 'orderConfirm')}</b>\n\n🛒 <b>${tr(lang, 'orderItems')}</b>\n${lines}${targetLine}\n\n<b>${tr(lang, 'amount')}</b>\n📲 ${lang === 'ru' ? 'По СБП' : 'SBP'}: ${rub(total)}\n💳 ${lang === 'ru' ? 'По Карте' : 'Bank card'}: ${rub(Math.ceil(total * 1.025))}\n💵 USDT: ${(total / 90).toFixed(2)} USDT\n\n${lang === 'ru' ? 'Всё верно?' : 'Is everything correct?'}`;

  await editOrReply(ctx, text, inlineKeyboard([
    [cb(tr(lang, 'continue'), 'payment:choose', 'success')],
    [cb(tr(lang, 'cancel'), 'cancel', 'danger')]
  ]));
  s.mode = 'confirm_order';
}

async function choosePayment(ctx) {
  const lang = langOf(ctx);
  const rows = (data.products().payments || ['СБП', 'Банковские карты РФ', 'USDT']).map(x => [cb(`💳 ${x}`, `pay:${x}`, x === 'USDT' ? 'success' : 'primary')]);
  rows.push([cb(tr(lang, 'cancel'), 'cancel', 'danger')]);
  await editOrReply(ctx, `<b>${tr(lang, 'paymentMethod')}</b>`, inlineKeyboard(rows));
  getSession(ctx).mode = 'payment';
}

async function createDisabledOrder(ctx, paymentMethod) {
  const lang = langOf(ctx);
  const s = getSession(ctx);
  const orders = data.orders();
  const order = {
    id: `MYK-${Date.now()}`,
    telegramId: uid(ctx),
    username: ctx.from?.username || '',
    items: cartItems(s),
    pubgId: s.pubgId,
    primeTarget: s.primeTarget,
    orderType: s.orderType,
    totalRub: cartTotal(s),
    totalUc: cartUc(s),
    paymentMethod,
    status: 'development_payment_disabled',
    createdAt: nowIso()
  };
  orders.unshift(order);
  data.saveOrders(orders);
  const text = `⚠️ <b>${tr(lang, 'paymentDisabled')}</b>\n\nOrder ID: <code>${order.id}</code>`;
  await editOrReply(ctx, text, mainInlineKeyboard(lang));
  resetSession(ctx);
}

function parseProductFromText(text) {
  const all = [...(data.products().pubg_uc || []), ...(data.products().prime_plus || [])];
  return all.find(p => text.includes(p.title));
}
function isValidPubgId(text) { return /^5\d{5,15}$/.test(String(text || '').trim()); }
function isValidTelegramTarget(text) {
  const v = String(text || '').trim();
  return /^@[A-Za-z0-9_]{5,32}$/.test(v) || /^\d{5,20}$/.test(v);
}

bot.start(sendWelcome);
bot.command('menu', sendWelcome);

// Block banned users globally.
bot.on('message', async (ctx, next) => {
  ensureUser(ctx);
  const user = ensureUser(ctx);
  if (user.banned) return;
  return next();
});

// Inline callbacks.
bot.action('menu:home', async (ctx) => { await ctx.answerCbQuery().catch(() => {}); resetSession(ctx); await showMain(ctx); });
bot.action('menu:uc', async (ctx) => { await ctx.answerCbQuery().catch(() => {}); await showUcMethod(ctx); });
bot.action('menu:prime', async (ctx) => { await ctx.answerCbQuery().catch(() => {}); await showPrime(ctx); });
bot.action('menu:language', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const user = ensureUser(ctx);
  user.lang = user.lang === 'ru' ? 'en' : 'ru';
  updateUser(uid(ctx), { lang: user.lang });
  await editOrReply(ctx, tr(user.lang, 'languageChanged'), mainInlineKeyboard(user.lang));
});
bot.action('menu:info', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const lang = langOf(ctx);
  const u = ensureUser(ctx);
  const msg = tr(lang, 'infoText', cfg).replace('{id}', u.id).replace('{username}', u.username || 'no_username');
  await editOrReply(ctx, msg, homeInline(lang), { disable_web_page_preview: true });
});
bot.action('uc:by_id', async (ctx) => { await ctx.answerCbQuery().catch(() => {}); await showUcCart(ctx); });
bot.action('uc:by_code', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  await editOrReply(ctx, langOf(ctx) === 'ru' ? 'Коды будут добавлены позже.' : 'Codes will be added later.', mainInlineKeyboard(langOf(ctx)));
});
bot.action(/^uc:add:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const s = getSession(ctx);
  addToCart(s, findProduct(ctx.match[1]), 1);
  await showUcCart(ctx);
});
bot.action(/^uc:remove:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const s = getSession(ctx);
  addToCart(s, findProduct(ctx.match[1]), -1);
  await showUcCart(ctx);
});
bot.action('uc:custom', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const lang = langOf(ctx);
  const s = getSession(ctx);
  s.mode = 'await_custom_uc';
  await editOrReply(ctx, `✍️ <b>${tr(lang, 'customAmount')}</b>\n\n${tr(lang, 'enterUc')}`, cancelInline(lang));
});
bot.action('cart:clear', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  getSession(ctx).cart = {};
  await showUcCart(ctx);
});
bot.action('checkout', async (ctx) => { await ctx.answerCbQuery().catch(() => {}); await confirmOrder(ctx); });
bot.action('payment:choose', async (ctx) => { await ctx.answerCbQuery().catch(() => {}); await choosePayment(ctx); });
bot.action(/^pay:(.+)$/, async (ctx) => { await ctx.answerCbQuery().catch(() => {}); await createDisabledOrder(ctx, ctx.match[1]); });
bot.action(/^prime:select:(.+)$/, async (ctx) => { await ctx.answerCbQuery().catch(() => {}); await askPrimeTarget(ctx, ctx.match[1]); });
bot.action('cancel', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  resetSession(ctx);
  await editOrReply(ctx, 'OK', mainInlineKeyboard(langOf(ctx)));
});

// Text commands are kept for compatibility only, but they do not show bottom keyboards.
bot.hears([/Главное меню/i, /Main menu/i, /🏠/], async (ctx) => { resetSession(ctx); await showMain(ctx); });
bot.hears([/Язык/i, /Language/i, /🌐/], async (ctx) => {
  const user = ensureUser(ctx);
  user.lang = user.lang === 'ru' ? 'en' : 'ru';
  updateUser(uid(ctx), { lang: user.lang });
  await ctx.reply(tr(user.lang, 'languageChanged'), mainInlineKeyboard(user.lang));
});
bot.hears([/^🛟\s*Помощь$/i, /^Помощь$/i, /^🛟\s*Support$/i, /^Support$/i], (ctx) => ctx.reply(`${tr(langOf(ctx), 'support')}: ${SUPPORT_URL}`, inlineKeyboard([[urlBtn('Open support', SUPPORT_URL, 'danger', EMOJI.support)]])));
bot.hears([/^📣\s*Канал$/i, /^Канал$/i, /^📣\s*Channel$/i, /^Channel$/i], (ctx) => ctx.reply(`${tr(langOf(ctx), 'channel')}: ${CHANNEL_URL}`, inlineKeyboard([[urlBtn('Open channel', CHANNEL_URL, 'success', EMOJI.channel)]])));
bot.hears([/^ℹ️\s*Информация$/i, /^Информация$/i, /^ℹ️\s*Information$/i, /^Information$/i], async (ctx) => {
  const lang = langOf(ctx);
  const u = ensureUser(ctx);
  const msg = tr(lang, 'infoText', cfg).replace('{id}', u.id).replace('{username}', u.username || 'no_username');
  await ctx.reply(msg, { disable_web_page_preview: true, ...homeInline(lang) });
});
bot.hears([/^💰\s*Купить UC$/i, /^Купить UC$/i, /^💰\s*Buy UC$/i, /^Buy UC$/i], showUcMethod);
bot.hears([/^⭐\s*Prime Plus$/i, /^Prime Plus$/i], showPrime);
bot.hears([/Топ донатеров/i, /Top donators/i, /🏆/], (ctx) => ctx.reply(tr(langOf(ctx), 'topText'), homeInline(langOf(ctx))));

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const lang = langOf(ctx);
  const s = getSession(ctx);
  const product = parseProductFromText(text);

  if (product) {
    if (product.category === 'prime_plus') {
      s.cart = {};
      addToCart(s, product, 1);
      s.orderType = 'prime';
      s.mode = 'await_prime_target';
      return ctx.reply(
        lang === 'ru'
          ? `⭐ <b>${product.title}</b>\n\nВведите Telegram username или Telegram ID аккаунта для активации.\n\nПример: <code>@username</code> или <code>8573174269</code>`
          : `⭐ <b>${product.title}</b>\n\nEnter Telegram username or Telegram ID for activation.\n\nExample: <code>@username</code> or <code>8573174269</code>`,
        { parse_mode: 'HTML', ...cancelInline(lang) }
      );
    }
    addToCart(s, product, text.includes('➖') || /Удалить|Remove/.test(text) ? -1 : 1);
    return showUcCart(ctx);
  }

  if (s.mode === 'await_prime_target') {
    if (!isValidTelegramTarget(text)) {
      return ctx.reply(
        lang === 'ru'
          ? `❗ <b>Неверный Telegram username / ID</b>\n\nВведите username в формате <code>@username</code> или числовой Telegram ID.`
          : `❗ <b>Invalid Telegram username / ID</b>\n\nEnter username like <code>@username</code> or numeric Telegram ID.`,
        { parse_mode: 'HTML', ...cancelInline(lang) }
      );
    }
    s.primeTarget = text;
    return confirmOrder(ctx);
  }

  if (s.mode === 'await_pubg_id') {
    if (!isValidPubgId(text)) return ctx.reply(`❗ <b>${tr(lang, 'invalidPubgId')}</b>`, { parse_mode: 'HTML', ...cancelInline(lang) });
    s.pubgId = text;
    return confirmOrder(ctx);
  }

  if (s.mode === 'await_custom_uc' && /^\d+$/.test(text)) {
    const amount = Number(text);
    const base = data.products().pubg_uc.find(x => x.id === 'uc_660') || { priceRub: 780, amount: 660 };
    const priceRub = Math.ceil(amount * (base.priceRub / base.amount));
    addToCart(s, { id: `custom_${Date.now()}`, category: 'pubg_uc', title: `${amount} UC`, amount, priceRub, ask_game_id: 1 }, 1);
    return showUcCart(ctx);
  }

  await ctx.reply(lang === 'ru' ? 'Используйте меню для навигации.' : 'Use the menu to navigate.', mainInlineKeyboard(lang));
});

function cmdArgs(ctx) { return ctx.message.text.split(' ').slice(1); }
function cmdRest(ctx) { return ctx.message.text.split(' ').slice(1).join(' '); }

bot.command('addbalance', (ctx) => { if (!adminOnly(ctx)) return; const [id, amount] = cmdArgs(ctx); const u = updateUser(id, { balanceRub: Number((data.users()[id]?.balanceRub || 0)) + Number(amount || 0) }); ctx.reply(`✅ Balance: ${id} = ${rub(u.balanceRub)}`); });
bot.command('removebalance', (ctx) => { if (!adminOnly(ctx)) return; const [id, amount] = cmdArgs(ctx); const u = updateUser(id, { balanceRub: Number((data.users()[id]?.balanceRub || 0)) - Number(amount || 0) }); ctx.reply(`✅ Balance: ${id} = ${rub(u.balanceRub)}`); });
bot.command('setbalance', (ctx) => { if (!adminOnly(ctx)) return; const [id, amount] = cmdArgs(ctx); const u = updateUser(id, { balanceRub: Number(amount || 0) }); ctx.reply(`✅ Balance: ${id} = ${rub(u.balanceRub)}`); });
bot.command('check', (ctx) => { if (!adminOnly(ctx)) return; const [id] = cmdArgs(ctx); const u = data.users()[id]; if (!u) return ctx.reply('Not found'); ctx.reply(JSON.stringify(u, null, 2)); });
bot.command('orders', (ctx) => { if (!adminOnly(ctx)) return; const orders = data.orders().slice(0, 20).map(o => `${o.id} | ${o.telegramId} | ${rub(o.totalRub)} | ${o.status}`).join('\n') || 'No orders'; ctx.reply(orders); });
bot.command('broadcast', async (ctx) => { if (!adminOnly(ctx)) return; const msg = cmdRest(ctx); if (!msg) return ctx.reply(tr(langOf(ctx), 'broadcastUsage')); const users = Object.keys(data.users()); let ok = 0; for (const id of users) { try { await ctx.telegram.sendMessage(id, msg); ok++; } catch {} } ctx.reply(`✅ Sent: ${ok}/${users.length}`); });
bot.command('reply', async (ctx) => { if (!adminOnly(ctx)) return; const [id, ...rest] = cmdArgs(ctx); const msg = rest.join(' '); if (!id || !msg) return ctx.reply(tr(langOf(ctx), 'replyUsage')); await ctx.telegram.sendMessage(id, msg); ctx.reply('✅ Replied'); });
bot.command('ban', (ctx) => { if (!adminOnly(ctx)) return; const [id] = cmdArgs(ctx); updateUser(id, { banned: true }); ctx.reply('✅ Banned'); });
bot.command('unban', (ctx) => { if (!adminOnly(ctx)) return; const [id] = cmdArgs(ctx); updateUser(id, { banned: false }); ctx.reply('✅ Unbanned'); });
bot.command('setmin', (ctx) => { if (!adminOnly(ctx)) return; const [id, amount] = cmdArgs(ctx); updateUser(id, { minAmount: Number(amount || 0) }); ctx.reply('✅ Minimum set'); });
bot.command('resetmin', (ctx) => { if (!adminOnly(ctx)) return; const [id] = cmdArgs(ctx); updateUser(id, { minAmount: null }); ctx.reply('✅ Minimum reset'); });
bot.command('addadmin', (ctx) => { if (uid(ctx) !== OWNER_ID) return ctx.reply('Owner only'); const [id] = cmdArgs(ctx); if (!id) return ctx.reply(tr(langOf(ctx), 'addAdminUsage')); const obj = data.admins(); const n = Number(String(id).replace('@','')); if (!obj.admins.map(Number).includes(n)) obj.admins.push(n); data.saveAdmins(obj); ctx.reply(`✅ Admin added: ${n}`); });
bot.command('deladmin', (ctx) => { if (uid(ctx) !== OWNER_ID) return ctx.reply('Owner only'); const [id] = cmdArgs(ctx); if (!id) return ctx.reply(tr(langOf(ctx), 'delAdminUsage')); const obj = data.admins(); obj.admins = obj.admins.filter(x => Number(x) !== Number(id)); data.saveAdmins(obj); ctx.reply(`✅ Admin removed: ${id}`); });
bot.command('admins', (ctx) => { if (!adminOnly(ctx)) return; ctx.reply((data.admins().admins || []).join('\n')); });
bot.command('addcoupon', (ctx) => { if (!adminOnly(ctx)) return; const [code, percent] = cmdArgs(ctx); const c = data.coupons(); c[code] = { percent: Number(percent || 0), createdAt: nowIso() }; data.saveCoupons(c); ctx.reply('✅ Coupon added'); });
bot.command('delcoupon', (ctx) => { if (!adminOnly(ctx)) return; const [code] = cmdArgs(ctx); const c = data.coupons(); delete c[code]; data.saveCoupons(c); ctx.reply('✅ Coupon deleted'); });
bot.command('coupons', (ctx) => { if (!adminOnly(ctx)) return; ctx.reply(JSON.stringify(data.coupons(), null, 2)); });
bot.command('prices', (ctx) => { if (!adminOnly(ctx)) return; const p = data.products(); const list = [...p.pubg_uc, ...p.prime_plus].map(x => `${x.category} | ${x.id} | ${x.title} | ${rub(x.priceRub)}`).join('\n'); ctx.reply(list || 'No products'); });
bot.command('setprice', (ctx) => { if (!adminOnly(ctx)) return; const [cat, id, price] = cmdArgs(ctx); const p = data.products(); const arr = p[cat] || []; const item = arr.find(x => x.id === id); if (!item) return ctx.reply('Product not found'); item.priceRub = Number(price); data.saveProducts(p); ctx.reply('✅ Price updated'); });
bot.command('addproduct', (ctx) => { if (!adminOnly(ctx)) return; const raw = cmdRest(ctx); const [id, category, title, base_price, rate, ask_game_id] = raw.split('|'); if (!id || !category || !title) return ctx.reply('/addproduct id|category|title|base_price|rate|ask_game_id(0/1)'); const p = data.products(); if (!p[category]) p[category] = []; p[category].push({ id, category, title, priceRub: Number(base_price || 0), rate: Number(rate || 100), ask_game_id: Number(ask_game_id || 0), active: true }); data.saveProducts(p); ctx.reply('✅ Product added/updated'); });
bot.command('delproduct', (ctx) => { if (!adminOnly(ctx)) return; const [id] = cmdArgs(ctx); const p = data.products(); for (const k of Object.keys(p)) if (Array.isArray(p[k])) p[k] = p[k].filter(x => x.id !== id); data.saveProducts(p); ctx.reply('✅ Product deleted'); });
bot.command('payments', (ctx) => { if (!adminOnly(ctx)) return; ctx.reply((data.products().payments || []).join('\n')); });
for (const c of ['discount24','discountall','setrate','setgamerate','setcoderate']) bot.command(c, (ctx) => { if (!adminOnly(ctx)) return; const st = data.settings(); st[c] = cmdRest(ctx) || true; data.saveSettings(st); ctx.reply('✅ Setting updated'); });
bot.command('exportusers', async (ctx) => { if (!adminOnly(ctx)) return; await ctx.replyWithDocument({ source: path.join(ROOT, 'data', 'users.json') }); });
bot.command('exportorders', async (ctx) => { if (!adminOnly(ctx)) return; await ctx.replyWithDocument({ source: path.join(ROOT, 'data', 'orders.json') }); });
bot.command('exportbalances', async (ctx) => { if (!adminOnly(ctx)) return; const users = data.users(); const rows = Object.values(users).map(u => `${u.id},${u.username || ''},${u.balanceRub || 0}`).join('\n'); const file = path.join(ROOT, 'backups', 'balances.csv'); fs.writeFileSync(file, 'id,username,balanceRub\n' + rows); await ctx.replyWithDocument({ source: file }); });
bot.command('backup', async (ctx) => { if (!adminOnly(ctx)) return; const file = path.join(ROOT, 'backups', `backup-${Date.now()}.json`); fs.writeFileSync(file, JSON.stringify({ users: data.users(), orders: data.orders(), products: data.products(), admins: data.admins(), coupons: data.coupons(), settings: data.settings() }, null, 2)); await ctx.replyWithDocument({ source: file }); });
bot.command('restore', (ctx) => { if (!adminOnly(ctx)) return; ctx.reply('Restore is disabled for safety. Upload JSON manually to data/ if needed.'); });

bot.catch((err, ctx) => {
  console.error('BOT ERROR', err);
  try { ctx.reply('Internal error.'); } catch {}
});

const app = express();
app.get('/', (_, res) => res.send('MAYKI UC BOT is running.'));
app.get('/health', (_, res) => res.json({ ok: true, name: BOT_NAME }));
app.listen(PORT, () => console.log(`Health server on ${PORT}`));

bot.launch({ dropPendingUpdates: true }).then(() => console.log(`${BOT_NAME} launched`));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
