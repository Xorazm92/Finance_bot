const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat_id: {
        type: Number,
        required: true,
        index: true
    },
    message_id: {
        type: Number,
        required: true
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

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
