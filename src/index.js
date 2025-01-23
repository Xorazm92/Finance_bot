const { Bot } = require('grammy');
const { ulanishMongoDB } = require('./models');
const { vazifaYaratish, vazifaniNazoratgaOlish, javobYozish, oylikHisobotYaratish } = require('./controllers/taskController');
const { xabarniSaqlash, guruhStatistikasi, hisobotniEmailgaYuborish } = require('./controllers/messageController');
const { guruhTekshirish, isStaff, isAccountant, isManager, isMonitor, isAdmin } = require('./middleware/auth');
const moment = require('moment');
require('dotenv').config();

// Botni yaratish
const bot = new Bot(process.env.BOT_TOKEN);

// Guruh tekshirish middleware
bot.use(guruhTekshirish);

// Har bir xabarni saqlash (middleware sifatida)
bot.use(async (ctx, next) => {
    if (ctx.message) {
        await xabarniSaqlash(ctx);
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
        if (!isMonitor(ctx.from.id)) {
            await ctx.reply("Kechirasiz, siz nazoratchi emassiz!");
            return;
        }

        if (!ctx.message.reply_to_message) {
            await ctx.reply("Iltimos, nazoratga olish uchun savolni reply qiling!");
            return;
        }

        const vazifa = await vazifaniNazoratgaOlish(ctx);
        await ctx.reply(
            " Savol nazoratga olindi!\n\n" +
            ` Savol: ${vazifa.savol_matni}\n` +
            ` Nazoratchi: ${ctx.from.first_name}`
        );
    } catch (error) {
        await ctx.reply(" Xatolik: " + error.message);
    }
});

// Hisobot buyrug'i
bot.command('hisobot', async (ctx) => {
    try {
        // Faqat guruh adminiga ruxsat berish
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply("Kechirasiz, hisobot olish huquqingiz yo'q!");
            return;
        }

        await ctx.reply("Hisobot tayyorlanmoqda...");
        const hisobotYoli = await oylikHisobotYaratish();
        
        // Hisobotni adminning shaxsiy chatiga yuborish
        try {
            await bot.api.sendDocument(process.env.ADMIN_ID, {
                source: hisobotYoli,
                filename: hisobotYoli.split('/').pop()
            });
            await ctx.reply(" Hisobot sizning shaxsiy chatingizga yuborildi!");
        } catch (error) {
            await ctx.reply(" Hisobotni yuborishda xatolik: Bot bilan shaxsiy chatni boshlang!");
        }
        
    } catch (error) {
        await ctx.reply(" Xatolik: " + error.message);
    }
});

// Statistika buyrug'i
bot.command('statistika', async (ctx) => {
    try {
        // Faqat admin uchun
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply("Kechirasiz, statistika olish huquqingiz yo'q!");
            return;
        }

        // Argumentlarni tekshirish
        const args = ctx.message.text.split(' ');
        let startDate, endDate;

        if (args.length === 1) {
            // Agar sana berilmagan bo'lsa, joriy oyni olish
            startDate = moment().startOf('month').toDate();
            endDate = moment().endOf('month').toDate();
        } else if (args.length === 2) {
            // Agar bitta sana berilgan bo'lsa (YYYY-MM formatida)
            const [year, month] = args[1].split('-');
            if (!year || !month || isNaN(year) || isNaN(month)) {
                await ctx.reply("Noto'g'ri format. Ishlatish: /statistika [YYYY-MM]");
                return;
            }
            startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
            endDate = moment(startDate).endOf('month').toDate();
        } else {
            await ctx.reply("Noto'g'ri format. Ishlatish: /statistika [YYYY-MM]");
            return;
        }

        await ctx.reply("Statistika tayyorlanmoqda...");
        
        try {
            const hisobotYoli = await guruhStatistikasi(startDate, endDate);
            
            // Hisobotni adminning shaxsiy chatiga yuborish
            await bot.api.sendDocument(process.env.ADMIN_ID, {
                source: hisobotYoli,
                filename: hisobotYoli.split('/').pop()
            });
            await ctx.reply(" Statistika hisoboti sizning shaxsiy chatingizga yuborildi!");
        } catch (error) {
            if (error.message === 'Bu davr uchun xabarlar topilmadi') {
                await ctx.reply(" Bu davr uchun xabarlar topilmadi. Iltimos boshqa sanani tanlang.");
            } else {
                await ctx.reply(" Hisobotni yuborishda xatolik: Bot bilan shaxsiy chatni boshlang!");
            }
        }
        
    } catch (error) {
        console.error('Statistika olishda xatolik:', error);
        await ctx.reply(" Xatolik: " + error.message);
    }
});

// Email orqali statistika olish
bot.command('email_statistika', async (ctx) => {
    try {
        // Faqat admin uchun
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply("Kechirasiz, statistika olish huquqingiz yo'q!");
            return;
        }

        // Argumentlarni tekshirish
        const args = ctx.message.text.split(' ');
        let startDate, endDate;

        if (args.length === 1) {
            // Agar sana berilmagan bo'lsa, joriy oyni olish
            startDate = moment().startOf('month').toDate();
            endDate = moment().endOf('month').toDate();
        } else if (args.length === 2) {
            // Agar bitta sana berilgan bo'lsa (YYYY-MM formatida)
            const [year, month] = args[1].split('-');
            if (!year || !month || isNaN(year) || isNaN(month)) {
                await ctx.reply("Noto'g'ri format. Ishlatish: /email_statistika [YYYY-MM]");
                return;
            }
            startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
            endDate = moment(startDate).endOf('month').toDate();
        } else {
            await ctx.reply("Noto'g'ri format. Ishlatish: /email_statistika [YYYY-MM]");
            return;
        }

        await ctx.reply("Statistika tayyorlanmoqda va emailga yuboriladi...");
        
        try {
            const hisobotYoli = await guruhStatistikasi(startDate, endDate, true);
            await ctx.reply(`✅ Statistika hisoboti ${process.env.GMAIL_USER} emailiga yuborildi!`);
        } catch (error) {
            if (error.message === 'Bu davr uchun xabarlar topilmadi') {
                await ctx.reply("❌ Bu davr uchun xabarlar topilmadi. Iltimos boshqa sanani tanlang.");
            } else {
                console.error('Email yuborishda xatolik:', error);
                await ctx.reply("❌ Hisobotni emailga yuborishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
            }
        }
        
    } catch (error) {
        console.error('Statistika olishda xatolik:', error);
        await ctx.reply("❌ Xatolik: " + error.message);
    }
});

// Xabarlarni qayta ishlash
bot.on('message:text', async (ctx) => {
    try {
        // Agar reply qilingan bo'lsa - javob
        if (ctx.message.reply_to_message) {
            if (!isStaff(ctx.from.id)) {
                await ctx.reply("Kechirasiz, faqat xodimlar javob bera oladi!");
                return;
            }

            const vazifa = await javobYozish(ctx);
            await ctx.reply(
                " Javobingiz qabul qilindi!\n\n" +
                ` Savol: ${vazifa.savol_matni}\n` +
                ` Javob: ${ctx.message.text}\n` +
                ` Javob beruvchi: ${ctx.from.first_name}`
            );
            return;
        }

        // Agar buxgalter yozgan bo'lsa - yangi savol
        if (isAccountant(ctx.from.id)) {
            const vazifa = await vazifaYaratish(ctx);
            await ctx.reply(
                " Yangi savol qabul qilindi!\n\n" +
                ` Savol beruvchi: ${ctx.from.first_name}\n` +
                ` Savol: ${vazifa.savol_matni}\n` +
                " Javob berish vaqti: 10 daqiqa"
            );
            return;
        }

        // Agar xodim yozgan bo'lsa - javob
        if (isStaff(ctx.from.id)) {
            const vazifa = await javobYozish(ctx);
            await ctx.reply(
                " Javobingiz qabul qilindi!\n\n" +
                ` Savol: ${vazifa.savol_matni}\n` +
                ` Javob: ${ctx.message.text}\n` +
                ` Javob beruvchi: ${ctx.from.first_name}`
            );
            return;
        }

        await ctx.reply("Kechirasiz, siz savol berish yoki javob yozish huquqiga ega emassiz!");

    } catch (error) {
        await ctx.reply(" Xatolik: " + error.message);
    }
});

// Xatoliklarni qayta ishlash
bot.catch((err) => {
    console.error('Bot xatosi:', err);
});

// Botni ishga tushirish
async function botniIshgaTushirish() {
    try {
        await ulanishMongoDB();
        console.log('Bazaga ulandi');
        
        await bot.start();
        console.log('Bot ishga tushdi');
    } catch (error) {
        console.error('Ishga tushirishda xatolik:', error);
        process.exit(1);
    }
}

botniIshgaTushirish();
