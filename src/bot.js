const { Telegraf } = require('telegraf');
const { Vazifa } = require('./models');
const XLSX = require('xlsx');
const path = require('path');
const moment = require('moment');
const connectDB = require('./config/db');
require('dotenv').config();

// MongoDB ulanish
connectDB();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Xatoliklarni ushlash
bot.catch((err, ctx) => {
    console.error(`Bot xatoligi uchun: ${ctx.updateType}`, err);
    ctx.reply("Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
});

// Hisobot olish komandasi
bot.command('hisobot', async (ctx) => {
    try {
        const guruhId = ctx.chat.id;
        const vazifalar = await Vazifa.find({ guruh_id: guruhId });
        
        if (vazifalar.length === 0) {
            return ctx.reply("Bu guruhda hali vazifalar mavjud emas.");
        }

        // Excel fayl yaratish
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(vazifalar.map(v => ({
            'Savol matni': v.savol_matni,
            'Berilgan vaqt': moment(v.berilgan_vaqt).format('DD.MM.YYYY HH:mm'),
            'Holat': v.holat,
            'Javob': v.javob || '',
            'Bajarilgan vaqt': v.bajarilgan_vaqt ? moment(v.bajarilgan_vaqt).format('DD.MM.YYYY HH:mm') : ''
        })));

        // Ustun kengliklari
        const colWidths = [
            { wch: 40 }, // Savol matni
            { wch: 20 }, // Berilgan vaqt
            { wch: 15 }, // Holat
            { wch: 40 }, // Javob
            { wch: 20 }  // Bajarilgan vaqt
        ];
        worksheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hisobot');
        
        // Hisobotlar papkasini tekshirish va yaratish
        const hisobotlarDir = path.join(__dirname, '..', 'hisobotlar');
        if (!require('fs').existsSync(hisobotlarDir)) {
            require('fs').mkdirSync(hisobotlarDir, { recursive: true });
        }
        
        // Fayl nomi uchun guruh ID va sana
        const fileName = `hisobot_${guruhId}_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
        const filePath = path.join(hisobotlarDir, fileName);
        
        // Excel faylni saqlash
        XLSX.writeFile(workbook, filePath);
        
        // Faylni yuborish
        await ctx.replyWithDocument({ source: filePath });
        
    } catch (error) {
        console.error('Hisobot yaratishda xatolik:', error);
        ctx.reply("Hisobot yaratishda xatolik yuz berdi.");
    }
});

// Start komandasi
bot.command('start', (ctx) => {
    ctx.reply("Salom! Men hisobot botiman. Guruhingiz uchun hisobot olish uchun /hisobot buyrug'ini yuboring.");
});

// Botni ishga tushirish
bot.launch().then(() => {
    console.log('Bot muvaffaqiyatli ishga tushdi!');
}).catch((error) => {
    console.error('Botni ishga tushirishda xatolik:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
