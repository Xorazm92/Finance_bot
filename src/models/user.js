const mongoose = require('mongoose');

const foydalanuvchiSxema = new mongoose.Schema({
    telegram_id: {
        type: Number,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    lavozim: {
        type: String,
        enum: ['xodim', 'hisobchi', 'rahbar'],
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Foydalanuvchi', foydalanuvchiSxema);
