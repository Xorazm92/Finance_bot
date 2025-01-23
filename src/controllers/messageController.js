const { Message } = require('../models');
const moment = require('moment');
const XLSX = require('xlsx');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transport yaratish
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// Xabarni saqlash
async function xabarniSaqlash(ctx) {
    try {
        const msg = ctx.message;
        
        // Reply qilingan xabar ID sini olish
        const replyToId = msg.reply_to_message?.message_id;
        
        // Agar bu javob bo'lsa, original xabarni topish
        let originalMessage = null;
        let responseTime = null;
        
        if (replyToId) {
            originalMessage = await Message.findOne({ message_id: replyToId });
            if (originalMessage) {
                responseTime = moment(msg.date * 1000).diff(originalMessage.created_at, 'minutes');
            }
        }

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
            reply_to_message_id: replyToId,
            original_message: originalMessage ? originalMessage._id : null,
            response_time: responseTime,
            created_at: new Date(msg.date * 1000)
        });

    } catch (error) {
        console.error('Xabarni saqlashda xatolik:', error);
    }
}

// Hisobotni email orqali yuborish
async function hisobotniEmailgaYuborish(filePath) {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER, // o'zingizning emailingizga yuboriladi
            subject: 'Guruh Statistikasi - ' + moment().format('YYYY-MM-DD HH:mm'),
            text: 'Iltimos, ilova qilingan hisobotni ko\'rib chiqing.',
            attachments: [{
                filename: path.basename(filePath),
                path: filePath
            }]
        };

        await transporter.sendMail(mailOptions);
        console.log('Hisobot emailga yuborildi');
        return true;
    } catch (error) {
        console.error('Emailga yuborishda xatolik:', error);
        throw error;
    }
}

// Guruh statistikasi hisoboti
async function guruhStatistikasi(startDate, endDate, emailRequired = false) {
    try {
        console.log('Statistika so\'rovi:', { startDate, endDate });

        // Vaqt oralig'idagi xabarlarni olish
        const messages = await Message.find({
            created_at: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ created_at: 1 });

        console.log('Topilgan xabarlar soni:', messages.length);

        if (messages.length === 0) {
            throw new Error('Bu davr uchun xabarlar topilmadi');
        }

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
            'Reply message ID': msg.reply_to_message_id || '-',
            'Javob vaqti (daqiqa)': msg.response_time || '-'
        }));

        // Javob berish vaqti statistikasi
        const responseStats = messages
            .filter(msg => msg.response_time !== null)
            .reduce((stats, msg) => {
                const responseTime = msg.response_time;
                return {
                    total: stats.total + 1,
                    onTime: stats.onTime + (responseTime <= 10 ? 1 : 0),
                    late: stats.late + (responseTime > 10 ? 1 : 0),
                    avgTime: stats.avgTime + responseTime
                };
            }, { total: 0, onTime: 0, late: 0, avgTime: 0 });

        if (responseStats.total > 0) {
            responseStats.avgTime = Math.round(responseStats.avgTime / responseStats.total);
        }

        // Xodimlar statistikasi
        const staffStats = {};
        messages.forEach(msg => {
            if (msg.response_time !== null) {
                if (!staffStats[msg.user_id]) {
                    staffStats[msg.user_id] = {
                        'Username': msg.username || '-',
                        'Ism': msg.first_name || '-',
                        'Jami javoblar': 0,
                        'O\'z vaqtida': 0,
                        'Kechikkan': 0,
                        'O\'rtacha javob vaqti': 0
                    };
                }
                
                const stats = staffStats[msg.user_id];
                stats['Jami javoblar']++;
                stats['O\'rtacha javob vaqti'] += msg.response_time;
                
                if (msg.response_time <= 10) {
                    stats['O\'z vaqtida']++;
                } else {
                    stats['Kechikkan']++;
                }
            }
        });

        // O'rtacha vaqtni hisoblash
        Object.values(staffStats).forEach(stats => {
            if (stats['Jami javoblar'] > 0) {
                stats['O\'rtacha javob vaqti'] = Math.round(stats['O\'rtacha javob vaqti'] / stats['Jami javoblar']);
            }
        });

        // Xabarlar varag'i
        const wsMessages = XLSX.utils.json_to_sheet(messageData);
        XLSX.utils.book_append_sheet(wb, wsMessages, 'Xabarlar');

        // Javob berish statistikasi varag'i
        const wsResponseStats = XLSX.utils.json_to_sheet([{
            'Jami javoblar': responseStats.total,
            'O\'z vaqtida (<= 10 daqiqa)': responseStats.onTime,
            'Kechikkan (> 10 daqiqa)': responseStats.late,
            'O\'rtacha javob vaqti': responseStats.avgTime + ' daqiqa',
            'O\'z vaqtidalik foizi': Math.round((responseStats.onTime / responseStats.total) * 100) + '%'
        }]);
        XLSX.utils.book_append_sheet(wb, wsResponseStats, 'Javob statistikasi');

        // Xodimlar statistikasi varag'i
        const wsStaffStats = XLSX.utils.json_to_sheet(Object.values(staffStats));
        XLSX.utils.book_append_sheet(wb, wsStaffStats, 'Xodimlar');

        // Hisobotlar papkasini yaratish
        const hisobotlarPath = path.join(__dirname, '../../hisobotlar');
        if (!require('fs').existsSync(hisobotlarPath)) {
            require('fs').mkdirSync(hisobotlarPath, { recursive: true });
        }

        // Faylni saqlash
        const fileName = `Guruh_statistikasi_${moment(startDate).format('YYYY_MM_DD')}-${moment(endDate).format('YYYY_MM_DD')}.xlsx`;
        const filePath = path.join(hisobotlarPath, fileName);
        XLSX.writeFile(wb, filePath);

        console.log('Hisobot yaratildi:', filePath);

        // Agar email yuborish so'ralgan bo'lsa
        if (emailRequired) {
            await hisobotniEmailgaYuborish(filePath);
        }

        return filePath;
    } catch (error) {
        console.error('Statistika hisobotini yaratishda xatolik:', error);
        throw error;
    }
}

module.exports = {
    xabarniSaqlash,
    guruhStatistikasi,
    hisobotniEmailgaYuborish
};
