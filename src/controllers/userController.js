const { Foydalanuvchi } = require('../models');
const { validateUser } = require('../middleware/validation');

async function foydalanuvchiQoshish(telegramId, username, lavozim) {
    try {
        // Validate input
        validateUser(telegramId, username, lavozim);

        // Foydalanuvchi mavjudligini tekshirish
        let foydalanuvchi = await Foydalanuvchi.findOne({ telegram_id: telegramId });
        
        if (foydalanuvchi) {
            // Mavjud foydalanuvchini yangilash
            foydalanuvchi.username = username;
            foydalanuvchi.lavozim = lavozim;
            await foydalanuvchi.save();
        } else {
            // Yangi foydalanuvchi yaratish
            foydalanuvchi = await Foydalanuvchi.create({
                telegram_id: telegramId,
                username: username,
                lavozim: lavozim,
                created_at: new Date()
            });
        }
        return foydalanuvchi;
    } catch (error) {
        throw new Error(`Foydalanuvchi qo'shishda xatolik: ${error.message}`);
    }
}

async function foydalanuvchiOlish(telegramId) {
    try {
        if (!telegramId) {
            throw new Error('Telegram ID kiritilmagan');
        }
        const foydalanuvchi = await Foydalanuvchi.findOne({ telegram_id: telegramId });
        if (!foydalanuvchi) {
            throw new Error('Foydalanuvchi topilmadi');
        }
        return foydalanuvchi;
    } catch (error) {
        throw new Error(`Foydalanuvchi olishda xatolik: ${error.message}`);
    }
}

module.exports = {
    foydalanuvchiQoshish,
    foydalanuvchiOlish
};
