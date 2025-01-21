const { Vazifa } = require('../models');
const moment = require('moment');
const XLSX = require('xlsx');
const path = require('path');

// Yangi vazifa yaratish
async function vazifaYaratish(ctx) {
    try {
        // Faqat accountantlar savol bera oladi
        const accountantIds = process.env.ACCOUNTANT_IDS?.split(',').map(Number) || [];
        if (!accountantIds.includes(ctx.from.id)) {
            throw new Error('Faqat buxgalterlar savol bera oladi');
        }

        const vazifa = await Vazifa.create({
            xabar_id: ctx.message.message_id,
            guruh_id: ctx.chat.id,
            savol_beruvchi: ctx.from.id,
            savol_matni: ctx.message.text,
            berilgan_vaqt: new Date()
        });

        console.log(`Yangi vazifa yaratildi: ${vazifa._id}`);
        return vazifa;
    } catch (error) {
        console.error('Vazifa yaratishda xatolik:', error);
        throw error;
    }
}

// Vazifani nazoratga olish
async function vazifaniNazoratgaOlish(ctx) {
    try {
        if (!ctx.message.reply_to_message) {
            throw new Error('Iltimos, nazoratga olish uchun savolni reply qiling');
        }

        const vazifa = await Vazifa.findOne({ 
            xabar_id: ctx.message.reply_to_message.message_id,
            guruh_id: ctx.chat.id
        });

        if (!vazifa) {
            throw new Error('Savol topilmadi');
        }

        if (vazifa.holat !== 'kutilmoqda') {
            throw new Error('Bu savol allaqachon nazoratda yoki bajarilgan');
        }

        vazifa.nazoratchi_id = ctx.from.id;
        vazifa.nazorat_vaqti = new Date();
        vazifa.holat = 'nazoratda';
        await vazifa.save();

        console.log(`Vazifa nazoratga olindi: ${vazifa._id}`);
        return vazifa;
    } catch (error) {
        console.error('Nazoratga olishda xatolik:', error);
        throw error;
    }
}

// Javob yozish
async function javobYozish(ctx) {
    try {
        // Faqat xodimlar javob bera oladi
        const staffIds = process.env.STAFF_IDS?.split(',').map(Number) || [];
        if (!staffIds.includes(ctx.from.id)) {
            throw new Error('Faqat xodimlar javob bera oladi');
        }

        let vazifa;
        
        // Agar savol reply qilingan bo'lsa
        if (ctx.message.reply_to_message) {
            vazifa = await Vazifa.findOne({ 
                xabar_id: ctx.message.reply_to_message.message_id,
                guruh_id: ctx.chat.id
            });

            if (!vazifa) {
                throw new Error('Bu xabarga bog\'liq savol topilmadi');
            }
        } 
        // Agar umumiy javob bo'lsa
        else {
            vazifa = await Vazifa.findOne({ 
                guruh_id: ctx.chat.id,
                holat: { $in: ['kutilmoqda', 'nazoratda'] }
            }).sort({ berilgan_vaqt: -1 }); // Eng so'nggi savol

            if (!vazifa) {
                throw new Error('Hozirda faol savollar yo\'q');
            }
        }

        // Javob berish muddatini tekshirish (10 daqiqa)
        const muddatOtgan = moment().diff(moment(vazifa.berilgan_vaqt), 'minutes') > 10;
        if (muddatOtgan && vazifa.holat === 'kutilmoqda') {
            vazifa.holat = 'muddati_otgan';
            await vazifa.save();
            throw new Error('Savolning javob berish muddati tugagan (10 daqiqa)');
        }

        if (vazifa.holat === 'bajarilgan') {
            throw new Error('Bu savolga allaqachon javob berilgan');
        }

        vazifa.javob_beruvchi = ctx.from.id;
        vazifa.javob_matni = ctx.message.text;
        vazifa.javob_vaqti = new Date();
        vazifa.javob_xabar_id = ctx.message.message_id;
        vazifa.holat = 'bajarilgan';

        await vazifa.save();
        console.log(`Vazifaga javob berildi: ${vazifa._id}`);
        return vazifa;
    } catch (error) {
        console.error('Javob yozishda xatolik:', error);
        throw error;
    }
}

// Oylik hisobot yaratish
async function oylikHisobotYaratish() {
    try {
        // O'tgan oyning birinchi va oxirgi kunlari
        const oyBoshi = moment().subtract(1, 'months').startOf('month').toDate();
        const oyOxiri = moment().subtract(1, 'months').endOf('month').toDate();

        // O'tgan oydagi vazifalarni olish
        const vazifalar = await Vazifa.find({
            berilgan_vaqt: {
                $gte: oyBoshi,
                $lte: oyOxiri
            }
        }).sort({ berilgan_vaqt: 1 });

        // Nazoratchilar statistikasi
        const nazoratchilar = {};
        vazifalar.forEach(vazifa => {
            if (vazifa.nazoratchi_id) {
                if (!nazoratchilar[vazifa.nazoratchi_id]) {
                    nazoratchilar[vazifa.nazoratchi_id] = {
                        jami_nazorat: 0,
                        oz_vaqtida: 0,
                        kechikkan: 0,
                        bajarilmagan: 0
                    };
                }

                nazoratchilar[vazifa.nazoratchi_id].jami_nazorat++;

                if (vazifa.nazorat_vaqti) {
                    const nazoratVaqti = moment(vazifa.nazorat_vaqti);
                    const berilganVaqt = moment(vazifa.berilgan_vaqt);
                    const farq = nazoratVaqti.diff(berilganVaqt, 'minutes');

                    if (farq <= 10) {
                        nazoratchilar[vazifa.nazoratchi_id].oz_vaqtida++;
                    } else {
                        nazoratchilar[vazifa.nazoratchi_id].kechikkan++;
                    }
                } else {
                    nazoratchilar[vazifa.nazoratchi_id].bajarilmagan++;
                }
            }
        });

        // Excel fayl yaratish
        const wb = XLSX.utils.book_new();

        // Nazoratchilar statistikasi
        const nazoratchilarMalumoti = Object.entries(nazoratchilar).map(([id, stat]) => ({
            'Nazoratchi ID': id,
            'Jami nazorat qilingan': stat.jami_nazorat,
            'O\'z vaqtida': stat.oz_vaqtida,
            'Kechikkan': stat.kechikkan,
            'Bajarilmagan': stat.bajarilmagan,
            'Samaradorlik (%)': Math.round((stat.oz_vaqtida / stat.jami_nazorat) * 100)
        }));

        // Vazifalar ma'lumotlari
        const vazifalarMalumoti = vazifalar.map(vazifa => ({
            'Sana': moment(vazifa.berilgan_vaqt).format('DD.MM.YYYY HH:mm'),
            'Savol beruvchi': vazifa.savol_beruvchi,
            'Savol': vazifa.savol_matni,
            'Nazoratchi': vazifa.nazoratchi_id || '-',
            'Nazorat vaqti': vazifa.nazorat_vaqti ? moment(vazifa.nazorat_vaqti).format('DD.MM.YYYY HH:mm') : '-',
            'Javob beruvchi': vazifa.javob_beruvchi || '-',
            'Javob vaqti': vazifa.javob_vaqti ? moment(vazifa.javob_vaqti).format('DD.MM.YYYY HH:mm') : '-',
            'Holat': vazifa.holat
        }));

        // Nazoratchilar varag'i
        const wsNazoratchilar = XLSX.utils.json_to_sheet(nazoratchilarMalumoti);
        XLSX.utils.book_append_sheet(wb, wsNazoratchilar, 'Nazoratchilar');

        // Vazifalar varag'i
        const wsVazifalar = XLSX.utils.json_to_sheet(vazifalarMalumoti);
        XLSX.utils.book_append_sheet(wb, wsVazifalar, 'Vazifalar');

        // Faylni saqlash
        const hisobotNomi = `Hisobot_${moment(oyBoshi).format('YYYY_MM')}.xlsx`;
        const hisobotYoli = path.join(__dirname, '../../hisobotlar', hisobotNomi);
        XLSX.writeFile(wb, hisobotYoli);

        return hisobotYoli;
    } catch (error) {
        console.error('Hisobot yaratishda xatolik:', error);
        throw new Error('Hisobot yaratib bo\'lmadi');
    }
}

module.exports = {
    vazifaYaratish,
    vazifaniNazoratgaOlish,
    javobYozish,
    oylikHisobotYaratish
};
