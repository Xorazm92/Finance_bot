const mongoose = require('mongoose');

// Log sxemasi
const logSxema = new mongoose.Schema({
    // Xabar ID
    xabar_id: {
        type: Number,
        required: true
    },
    // Guruh ID
    guruh_id: {
        type: Number,
        required: true
    },
    // Foydalanuvchi ID
    foydalanuvchi_id: {
        type: Number,
        required: true,
        ref: 'Foydalanuvchi'
    },
    // Xabar matni
    xabar_matni: {
        type: String,
        required: true
    },
    // Xabar turi
    xabar_turi: {
        type: String,
        enum: ['savol', 'javob', 'ogohlantirish', 'boshqa'],
        required: true
    },
    // Vaqt
    vaqt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Log modelini yaratish
module.exports = mongoose.model('Log', logSxema);
