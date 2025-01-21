const { Log } = require('../models/log');

const errorHandler = async (err, ctx) => {
    try {
        // Log error to database
        await Log.create({
            level: 'error',
            message: err.message,
            stack: err.stack,
            metadata: {
                update_id: ctx.update?.update_id,
                user: ctx.from,
                chat: ctx.chat
            }
        });

        // Send user-friendly message
        await ctx.reply("Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring yoki administratorga murojaat qiling.");
    } catch (logError) {
        console.error('Error logging failed:', logError);
    }
};

module.exports = errorHandler;
