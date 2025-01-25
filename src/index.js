const { Bot } = require('grammy');
const express = require('express');
const mongoose = require('mongoose');
const logger = require('./config/logger');
require('dotenv').config();

// Express app setup
const app = express();
app.use(express.json());

// Bot setup
const bot = new Bot(process.env.BOT_TOKEN);

// MongoDB connection with proper error handling
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    logger.info('MongoDB ulanish muvaffaqiyatli');
    
    // Only start Express server after successful DB connection
    const PORT = process.env.PORT || 3333;
    app.listen(PORT, () => {
        logger.info(`Server ${PORT} portida ishga tushdi`);
    });
})
.catch(err => {
    logger.error('MongoDB ulanish xatosi:', err);
    process.exit(1);
});

// Add error handling middleware
app.use((err, req, res, next) => {
    logger.error('Server xatosi:', { error: err.message, stack: err.stack });
    res.status(500).json({
        success: false,
        message: 'Serverda xatolik yuz berdi',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Routes
app.use('/api/reports', require('./routes/reportRoutes'));

// Guruh tekshirish middleware
bot.use(require('./middleware/auth').guruhTekshirish);

// Har bir xabarni saqlash (middleware sifatida)
bot.use(async (ctx, next) => {
    if (ctx.message) {
        try {
            await require('./controllers/messageController').xabarniSaqlash(ctx);
            logger.info('Yangi xabar saqlandi', {
                from: ctx.from.id,
                messageId: ctx.message.message_id
            });
        } catch (error) {
            logger.error('Xabarni saqlashda xatolik:', error);
        }
    }
    await next();
});

// Start buyrug'i
bot.command('start', async (ctx) => {
    const message = 
        "Xush kelibsiz! \n\n" +
        "Bot ishlash tartibi:\n" +
        "1. Buxgalterlar xohlagan xabarni savol sifatida yozishlari mumkin\n" +
        "2. Javob berish uchun savolga reply qiling yoki to'g'ridan-to'g'ri javob yozing\n" +
        "3. Nazoratchilar savolni nazoratga olish uchun /nazorat buyrug'ini ishlatishlari mumkin\n" +
        "4. Har bir savol uchun javob berish muddati 10 daqiqa\n\n" +
        "Eslatma:\n" +
        "- Faqat buxgalterlar savol bera oladi\n" +
        "- Faqat xodimlar javob bera oladi\n" +
        "- Nazoratchilar savollarni nazoratga olishlari mumkin";
    
    await ctx.reply(message);
});

// Nazorat buyrug'i
bot.command('nazorat', async (ctx) => {
    try {
        if (!require('./middleware/auth').isMonitor(ctx.from.id)) {
            await ctx.reply("Kechirasiz, siz nazoratchi emassiz!");
            return;
        }

        if (!ctx.message.reply_to_message) {
            await ctx.reply("Iltimos, nazoratga olish uchun savolni reply qiling!");
            return;
        }

        const vazifa = await require('./controllers/taskController').vazifaniNazoratgaOlish(ctx);
        await ctx.reply(
            "✅ Savol nazoratga olindi!\n\n" +
            `📝 Savol: ${vazifa.savol_matni}\n` +
            `👤 Nazoratchi: ${ctx.from.first_name}`
        );
    } catch (error) {
        logger.error('Nazorat buyrug\'ida xatolik:', error);
        await ctx.reply("❌ Xatolik: " + error.message);
    }
});

// Hisobot buyrug'i
bot.command('hisobot', async (ctx) => {
    try {
        // Faqat admin va nazoratchilar uchun
        if (!require('./middleware/auth').isMonitor(ctx.from.id)) {
            await ctx.reply("Kechirasiz, hisobot olish huquqingiz yo'q!");
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Hisobot yaratish
        const reportIds = process.env.REPORT_IDS ? process.env.REPORT_IDS.split(',').map(id => parseInt(id)) : [];
        if (!reportIds.length) {
            await ctx.reply("Hisobotlar guruhi sozlanmagan!");
            return;
        }

        await ctx.reply("📊 Hisobot tayyorlanmoqda...");

        // Hisobotni yaratish va yuborish
        try {
            const { formattedMessages, startDate, endDate } = await require('./controllers/reportController').generateReport(year, month);
            
            // Excel faylni yaratish
            const XLSX = require('xlsx');
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(formattedMessages);
            
            // Ustun kengliklari
            const columnWidths = [
                { wch: 20 }, // vaqt
                { wch: 12 }, // chat_id
                { wch: 12 }, // user_id
                { wch: 15 }, // username
                { wch: 20 }, // xabar_vaqti
                { wch: 12 }, // xabar_turi
                { wch: 50 }, // xabar
                { wch: 15 }, // xodim
                { wch: 15 }, // xodim_username
                { wch: 20 }, // javob_vaqti
                { wch: 12 }, // javob_turi
                { wch: 50 }, // javob
                { wch: 15 }  // javob_vaqti_farqi
            ];
            worksheet['!cols'] = columnWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Hisobot');
            
            // Faylni vaqtincha saqlash
            const tempFilePath = `/tmp/hisobot_${year}_${month}.xlsx`;
            XLSX.writeFile(workbook, tempFilePath);

            // Hisobotni maxsus guruhga yuborish
            for (const chatId of reportIds) {
                try {
                    await bot.api.sendDocument(chatId, {
                        source: tempFilePath,
                        caption: `📊 ${year}-yil ${month}-oy uchun hisobot\n\n` +
                                `📅 Davr: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n` +
                                `📝 Jami xabarlar: ${formattedMessages.length}\n\n` +
                                `🔍 So'rov yuborgan guruh: ${ctx.chat.title || ctx.chat.id}\n` +
                                `👤 So'rov yuborgan foydalanuvchi: ${ctx.from.first_name}`
                    });
                } catch (error) {
                    logger.error(`Hisobotni yuborishda xatolik (chat_id: ${chatId}):`, error);
                }
            }

            // Faylni o'chirish
            require('fs').unlinkSync(tempFilePath);

            // So'rov yuborilgan guruhga xabar
            await ctx.reply(
                "✅ Hisobot tayyorlandi va maxsus guruhga yuborildi!\n\n" +
                `📅 Davr: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n` +
                `📝 Jami xabarlar: ${formattedMessages.length}`
            );

        } catch (error) {
            logger.error('Hisobotni yaratishda xatolik:', error);
            await ctx.reply("❌ Hisobotni yaratishda xatolik yuz berdi: " + error.message);
        }
    } catch (error) {
        logger.error('Hisobot buyrug\'ida xatolik:', error);
        await ctx.reply("❌ Xatolik: " + error.message);
    }
});

// Statistika buyrug'i
bot.command('statistika', async (ctx) => {
    try {
        // Faqat admin uchun
        if (!require('./middleware/auth').isAdmin(ctx.from.id)) {
            await ctx.reply("Kechirasiz, statistika olish huquqingiz yo'q!");
            return;
        }

        const stats = await require('./controllers/statsController').getStats();
        await ctx.reply(
            "📊 Bot statistikasi:\n\n" +
            `📝 Jami xabarlar: ${stats.totalMessages}\n` +
            `❓ Savollar: ${stats.questions}\n` +
            `✅ Javoblar: ${stats.answers}\n` +
            `⏱ O'rtacha javob vaqti: ${stats.avgResponseTime} daqiqa\n` +
            `👥 Faol foydalanuvchilar: ${stats.activeUsers}\n` +
            `📈 Bugun: ${stats.today.total} ta xabar\n` +
            `   ├ Savollar: ${stats.today.questions}\n` +
            `   └ Javoblar: ${stats.today.answers}`
        );
    } catch (error) {
        logger.error('Statistika buyrug\'ida xatolik:', error);
        await ctx.reply("❌ Xatolik: " + error.message);
    }
});

// Text xabarlarni qayta ishlash
bot.on('message:text', async (ctx) => {
    try {
        // Agar reply qilingan bo'lsa - javob
        if (ctx.message.reply_to_message) {
            if (!require('./middleware/auth').isStaff(ctx.from.id)) {
                await ctx.reply("Kechirasiz, siz xodim emassiz!");
                return;
            }

            const javob = await require('./controllers/messageController').javobniSaqlash(ctx);
            await ctx.reply(
                "✅ Javob saqlandi!\n\n" +
                `❓ Savol: ${javob.savol}\n` +
                `✍️ Javob: ${javob.javob}\n` +
                `⏱ Javob vaqti: ${javob.javobVaqti}`
            );
        }
        // Aks holda - yangi savol
        else {
            if (!require('./middleware/auth').isAccountant(ctx.from.id)) {
                await ctx.reply("Kechirasiz, siz buxgalter emassiz!");
                return;
            }

            const savol = await require('./controllers/messageController').savolniSaqlash(ctx);
            await ctx.reply(
                "✅ Savolingiz qabul qilindi!\n\n" +
                `📝 Savol: ${savol.text}\n` +
                "⏳ Javob kutilmoqda..."
            );
        }
    } catch (error) {
        logger.error('Xabar qayta ishlashda xatolik:', error);
        await ctx.reply("❌ Xatolik: " + error.message);
    }
});

// Botni ishga tushirish
async function botniIshgaTushirish() {
    try {
        await bot.start();
        logger.info('Bot muvaffaqiyatli ishga tushdi');
    } catch (error) {
        logger.error('Bot ishga tushishida xatolik:', error);
    }
}

botniIshgaTushirish();
