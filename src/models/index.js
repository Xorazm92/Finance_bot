const mongoose = require('mongoose');

// Vazifa sxemasi
const vazifaSchema = new mongoose.Schema({
    xabar_id: { type: Number, required: true },
    guruh_id: { type: Number, required: true },
    savol_beruvchi: { type: Number, required: true },
    savol_matni: { type: String, required: true },
    berilgan_vaqt: { type: Date, default: Date.now },
    
    // Nazorat ma'lumotlari
    nazoratchi_id: Number,
    nazorat_vaqti: Date,
    
    // Javob ma'lumotlari
    javob_beruvchi: Number,
    javob_matni: String,
    javob_vaqti: Date,
    javob_xabar_id: Number,
    
    // Holat
    holat: {
        type: String,
        enum: ['kutilmoqda', 'nazoratda', 'bajarilgan', 'muddati_otgan'],
        default: 'kutilmoqda'
    }
});

const Vazifa = mongoose.model('Vazifa', vazifaSchema);

// MongoDB ga ulanish
async function ulanishMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_bot');
        console.log('MongoDB ga ulandi');
    } catch (error) {
        console.error('MongoDB ga ulanishda xatolik:', error);
        throw error;
    }
}

// Modellarni import qilish
const Foydalanuvchi = require('./user');
const Log = require('./log');
const Message = require('./message');

// Modellarni eksport qilish
module.exports = {
    ulanishMongoDB,
    Foydalanuvchi,
    Vazifa,
    Log,
    Message
};
