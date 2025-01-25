const Message = require('../models/message');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Hisobot yaratish funksiyasi
exports.generateReport = async (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const messages = await Message.aggregate([
        {
            $match: {
                created_at: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $lookup: {
                from: 'messages',
                localField: '_id',
                foreignField: 'response_to',
                as: 'responses'
            }
        },
        {
            $project: {
                chat_id: 1,
                user_id: 1,
                username: 1,
                message_type: 1,
                text: 1,
                created_at: 1,
                is_staff: 1,
                staff_role: 1,
                response_time: 1,
                responses: {
                    $slice: ['$responses', 1]
                }
            }
        },
        {
            $sort: {
                created_at: 1
            }
        }
    ]);

    const formattedMessages = messages.map(msg => ({
        vaqt: msg.created_at.toISOString(),
        chat_id: msg.chat_id,
        user_id: msg.user_id,
        username: msg.username,
        xabar_vaqti: msg.created_at.toISOString(),
        xabar_turi: msg.message_type,
        xabar: msg.text,
        xodim: msg.is_staff ? msg.staff_role : '',
        xodim_username: msg.is_staff ? msg.username : '',
        javob_vaqti: msg.responses[0]?.created_at?.toISOString() || '',
        javob_turi: msg.responses[0]?.message_type || '',
        javob: msg.responses[0]?.text || '',
        javob_vaqti_farqi: msg.response_time || ''
    }));

    return {
        formattedMessages,
        startDate,
        endDate
    };
};

exports.getMonthlyReport = async (req, res) => {
    try {
        const { year, month, format } = req.query;
        
        if (!year || !month) {
            return res.status(400).json({
                success: false,
                message: "Yil va oy ko'rsatilishi shart"
            });
        }

        // Validate year and month
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        
        if (isNaN(yearNum) || isNaN(monthNum) || 
            monthNum < 1 || monthNum > 12 || 
            yearNum < 2000 || yearNum > 2100) {
            return res.status(400).json({
                success: false,
                message: "Noto'g'ri yil yoki oy formati"
            });
        }

        console.log(`Hisobot so'rovi: ${yearNum}-${monthNum}`);
        
        const reportData = await exports.generateReport(yearNum, monthNum);

        console.log(`Topilgan xabarlar soni: ${reportData.formattedMessages.length}`);

        // Agar format=excel bo'lsa Excel fayl qaytaramiz
        if (format === 'excel') {
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(reportData.formattedMessages);
            
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
            
            // Hisobotlar papkasini yaratish
            const reportsDir = path.join(__dirname, '..', 'reports');
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }
            
            // Fayl nomini yaratish
            const fileName = `hisobot_${yearNum}_${monthNum}.xlsx`;
            const filePath = path.join(reportsDir, fileName);
            
            // Excel faylni saqlash
            XLSX.writeFile(workbook, filePath);
            
            // Faylni yuborish
            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('Faylni yuborishda xatolik:', err);
                }
                // Faylni o'chirish
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Faylni o\'chirishda xatolik:', err);
                });
            });
        } else {
            // JSON formatda qaytarish
            res.json({
                success: true,
                data: reportData.formattedMessages,
                meta: {
                    total: reportData.formattedMessages.length,
                    period: {
                        start: reportData.startDate.toISOString(),
                        end: reportData.endDate.toISOString()
                    }
                }
            });
        }
    } catch (error) {
        console.error('Hisobot yaratishda xatolik:', error);
        res.status(500).json({
            success: false,
            message: 'Hisobot yaratishda xatolik yuz berdi',
            error: error.message
        });
    }
};

exports.getCurrentMonthReport = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        console.log(`Joriy oy hisoboti so'rovi: ${year}-${month}`);

        const reportData = await exports.generateReport(year, month);

        res.json({
            success: true,
            data: reportData.formattedMessages,
            meta: {
                total: reportData.formattedMessages.length,
                period: {
                    start: reportData.startDate.toISOString(),
                    end: reportData.endDate.toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Joriy oy hisoboti yaratish xatosi:', error);
        res.status(500).json({
            success: false,
            message: "Joriy oy hisobotini yaratishda xatolik yuz berdi",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
