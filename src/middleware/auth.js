require('dotenv').config();

const { Foydalanuvchi } = require('../models');

// Env dan ID larni olish
const STAFF_IDS = process.env.STAFF_IDS ? process.env.STAFF_IDS.split(',').map(Number) : [];
const ACCOUNTANT_IDS = process.env.ACCOUNTANT_IDS ? process.env.ACCOUNTANT_IDS.split(',').map(Number) : [];
const MONITOR_IDS = process.env.MONITOR_IDS ? process.env.MONITOR_IDS.split(',').map(Number) : [];
const ADMIN_ID = Number(process.env.ADMIN_ID);
const GROUP_ID = Number(process.env.GROUP_ID);

// Web route authentication middleware
const auth = (req, res, next) => {
    // TODO: Add proper authentication later
    // For now, allow all requests
    next();
};

// Guruh tekshirish
async function guruhTekshirish(ctx, next) {
    // Start buyrug'i uchun shaxsiy chatga ruxsat berish
    if (ctx.chat.type === 'private' && ctx.message?.text === '/start') {
        await next();
        return;
    }

    // Guruh emas bo'lsa
    if (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup') {
        await ctx.reply("Bu bot faqat guruhlarda ishlaydi!");
        return;
    }
    
    // Noto'g'ri guruh bo'lsa
    if (ctx.chat.id !== GROUP_ID) {
        await ctx.reply("Bot faqat belgilangan guruhda ishlaydi!");
        return;
    }
    
    await next();
}

// Foydalanuvchi huquqlarini tekshirish
function isStaff(userId) {
    return STAFF_IDS.includes(userId) || isAdmin(userId);
}

function isAccountant(userId) {
    return ACCOUNTANT_IDS.includes(userId);
}

function isMonitor(userId) {
    return MONITOR_IDS.includes(userId) || isAdmin(userId);
}

function isAdmin(userId) {
    return userId === ADMIN_ID;
}

module.exports = {
    auth,
    guruhTekshirish,
    isStaff,
    isAccountant,
    isMonitor,
    isAdmin
};
