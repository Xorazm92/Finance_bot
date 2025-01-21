const { Message } = require('../models');
const moment = require('moment');
const XLSX = require('xlsx');
const path = require('path');

// Xabarni saqlash
async function xabarniSaqlash(ctx) {
    try {
        const msg = ctx.message;
        let messageType = 'text';
        let fileId = null;
        let text = msg.text;

        // Xabar turini aniqlash
        if (msg.photo) {
            messageType = 'photo';
            fileId = msg.photo[msg.photo.length - 1].file_id;
            text = msg.caption;
        } else if (msg.video) {
            messageType = 'video';
            fileId = msg.video.file_id;
            text = msg.caption;
        } else if (msg.document) {
            messageType = 'document';
            fileId = msg.document.file_id;
            text = msg.caption;
        } else if (msg.voice) {
            messageType = 'voice';
            fileId = msg.voice.file_id;
        } else if (msg.sticker) {
            messageType = 'sticker';
            fileId = msg.sticker.file_id;
        } else if (!msg.text) {
            messageType = 'other';
        }

        // Xabarni saqlash
        await Message.create({
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            user_id: msg.from.id,
            username: msg.from.username,
            first_name: msg.from.first_name,
            last_name: msg.from.last_name,
            message_type: messageType,
            text: text,
            file_id: fileId,
            reply_to_message_id: msg.reply_to_message?.message_id,
            created_at: new Date(msg.date * 1000)
        });

    } catch (error) {
        console.error('Xabarni saqlashda xatolik:', error);
    }
}

// Guruh statistikasi hisoboti
async function guruhStatistikasi(startDate, endDate) {
    try {
        // Vaqt oralig'idagi xabarlarni olish
        const messages = await Message.find({
            created_at: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ created_at: 1 });

        // Excel fayl yaratish
        const wb = XLSX.utils.book_new();

        // Xabarlar ma'lumotlari
        const messageData = messages.map(msg => ({
            'Vaqt': moment(msg.created_at).format('DD.MM.YYYY HH:mm:ss'),
            'Chat ID': msg.chat_id,
            'Foydalanuvchi ID': msg.user_id,
            'Username': msg.username || '-',
            'Ism': msg.first_name || '-',
            'Familiya': msg.last_name || '-',
            'Xabar turi': msg.message_type,
            'Xabar': msg.text || '-',
            'File ID': msg.file_id || '-',
            'Reply message ID': msg.reply_to_message_id || '-'
        }));

        // Umumiy statistika
        const stats = {
            'Jami xabarlar': messages.length,
            'Matn xabarlar': messages.filter(m => m.message_type === 'text').length,
            'Rasm xabarlar': messages.filter(m => m.message_type === 'photo').length,
            'Video xabarlar': messages.filter(m => m.message_type === 'video').length,
            'Fayl xabarlar': messages.filter(m => m.message_type === 'document').length,
            'Voice xabarlar': messages.filter(m => m.message_type === 'voice').length,
            'Sticker xabarlar': messages.filter(m => m.message_type === 'sticker').length,
            'Boshqa xabarlar': messages.filter(m => m.message_type === 'other').length
        };

        // Foydalanuvchilar statistikasi
        const userStats = {};
        messages.forEach(msg => {
            if (!userStats[msg.user_id]) {
                userStats[msg.user_id] = {
                    'Username': msg.username || '-',
                    'Ism': msg.first_name || '-',
                    'Jami xabarlar': 0,
                    'Matn xabarlar': 0,
                    'Media xabarlar': 0
                };
            }
            userStats[msg.user_id]['Jami xabarlar']++;
            if (msg.message_type === 'text') {
                userStats[msg.user_id]['Matn xabarlar']++;
            } else {
                userStats[msg.user_id]['Media xabarlar']++;
            }
        });

        // Xabarlar varag'i
        const wsMessages = XLSX.utils.json_to_sheet(messageData);
        XLSX.utils.book_append_sheet(wb, wsMessages, 'Xabarlar');

        // Statistika varag'i
        const wsStats = XLSX.utils.json_to_sheet([stats]);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Umumiy statistika');

        // Foydalanuvchilar statistikasi varag'i
        const wsUserStats = XLSX.utils.json_to_sheet(Object.values(userStats));
        XLSX.utils.book_append_sheet(wb, wsUserStats, 'Foydalanuvchilar');

        // Faylni saqlash
        const fileName = `Guruh_statistikasi_${moment(startDate).format('YYYY_MM_DD')}-${moment(endDate).format('YYYY_MM_DD')}.xlsx`;
        const filePath = path.join(__dirname, '../../hisobotlar', fileName);
        XLSX.writeFile(wb, filePath);

        return filePath;
    } catch (error) {
        console.error('Statistika hisobotini yaratishda xatolik:', error);
        throw new Error('Hisobot yaratib bo\'lmadi');
    }
}

module.exports = {
    xabarniSaqlash,
    guruhStatistikasi
};
