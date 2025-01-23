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
        enum: ['text', 'photo', 'video', 'document', 'voice', 'sticker', 'other'],
        required: true
    },
    text: String,
    file_id: String,
    reply_to_message_id: Number,
    original_message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    response_time: {
        type: Number,
        default: null
    },
    is_edited: {
        type: Boolean,
        default: false
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Indekslar
messageSchema.index({ message_id: 1 }, { unique: true });
messageSchema.index({ chat_id: 1, created_at: 1 });
messageSchema.index({ user_id: 1, created_at: 1 });
messageSchema.index({ reply_to_message_id: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
