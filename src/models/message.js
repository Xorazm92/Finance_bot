const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat_id: {
        type: Number,
        required: true,
        index: true
    },
    message_id: {
        type: Number,
        required: true,
        unique: true
    },
    user_id: {
        type: Number,
        required: true,
        index: true
    },
    username: String,
    first_name: String,
    last_name: String,
    message_type: {
        type: String,
        enum: ['text', 'photo', 'video', 'document', 'voice', 'sticker', 'response', 'other'],
        required: true
    },
    text: String,
    file_id: String,
    reply_to_message_id: Number,
    original_message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    created_at: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    is_staff: {
        type: Boolean,
        default: false
    },
    staff_role: {
        type: String,
        enum: ['Staff', 'Accountant', 'Manager', 'Monitor', 'Admin'],
        sparse: true
    },
    response_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        sparse: true
    },
    response_time: {
        type: Number, // Response time in minutes
        sparse: true
    },
    is_edited: {
        type: Boolean,
        default: false
    },
    is_deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indekslarni bir marta e'lon qilish
messageSchema.index({ message_id: 1 });
messageSchema.index({ created_at: 1 });

// Static method to generate monthly report
messageSchema.statics.generateMonthlyReport = async function(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const messages = await this.aggregate([
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

    return messages.map(msg => ({
        vaqt: msg.created_at.toISOString(),
        chat_id: msg.chat_id,
        user_id: msg.user_id,
        username: msg.username,
        xabar_vaqti: msg.created_at.toISOString(),
        xabar_turi: msg.message_type,
        xabar: msg.text,
        xodim: msg.is_staff ? {
            role: msg.staff_role,
            username: msg.username
        } : null,
        javob_vaqti: msg.responses[0]?.created_at?.toISOString() || null,
        javob_turi: msg.responses[0]?.message_type || null,
        javob: msg.responses[0]?.text || null,
        javob_vaqti_farqi: msg.response_time || null
    }));
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
