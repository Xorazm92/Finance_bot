const mongoose = require('mongoose');

// Vazifa sxemasi
const vazifaSxema = new mongoose.Schema({
    // Savol xabari ID
    xabar_id: {
        type: Number,
        required: true
    },
    // Guruh ID
    guruh_id: {
        type: Number,
        required: true
    },
    // Savol beruvchi
    savol_beruvchi: {
        type: Number,
        required: true,
        ref: 'Foydalanuvchi'
    },
    // Savol matni
    savol_matni: {
        type: String,
        required: true
    },
    // Berilgan vaqt
    berilgan_vaqt: {
        type: Date,
        required: true
    },
    
    // Nazoratchi ma'lumotlari (Hisobchi/Xodim/Rahbar)
    nazoratchi_id: {
        type: Number
    },
    nazorat_vaqti: {
        type: Date
    },
    nazorat_holati: {
        type: String,
        enum: ['kutilmoqda', 'nazoratda', 'bajarilgan', 'muddati_otgan']
    },
    
    // Javob beruvchi ma'lumotlari
    javob_beruvchi: {
        type: Number
    },
    javob_matni: {
        type: String
    },
    javob_vaqti: {
        type: Date
    },
    javob_xabar_id: {
        type: Number
    },
    
    // Qo'shimcha ma'lumotlar
    holat: {
        type: String,
        enum: ['kutilmoqda', 'nazoratda', 'bajarilgan', 'muddati_otgan'],
        default: 'kutilmoqda'
    },
    qadalgan: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Vazifa modelini eksport qilish
module.exports = mongoose.model('Vazifa', vazifaSxema);
