require('dotenv').config();

const { Foydalanuvchi } = require('../models');

// Env dan ID larni olish
const STAFF_IDS = process.env.STAFF_IDS ? process.env.STAFF_IDS.split(',').map(Number) : [];
const ACCOUNTANT_IDS = process.env.ACCOUNTANT_IDS ? process.env.ACCOUNTANT_IDS.split(',').map(Number) : [];
const ADMIN_ID = Number(process.env.ADMIN_ID);
const GROUP_ID = Number(process.env.GROUP_ID);

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
    if (!process.env.STAFF_IDS) return false;
    return process.env.STAFF_IDS.split(',').map(Number).includes(userId);
}

function isAccountant(userId) {
    if (!process.env.ACCOUNTANT_IDS) return false;
    return process.env.ACCOUNTANT_IDS.split(',').map(Number).includes(userId);
}

function isManager(userId) {
    if (!process.env.MANAGER_ID) return false;
    return userId === Number(process.env.MANAGER_ID);
}

function isMonitor(userId) {
    return isStaff(userId) || isAccountant(userId) || isManager(userId);
}

// Admin ekanligini tekshirish
function isAdmin(userId) {
    return userId === ADMIN_ID;
}

module.exports = {
    guruhTekshirish,
    isStaff,
    isAccountant,
    isManager,
    isMonitor,
    isAdmin
};
