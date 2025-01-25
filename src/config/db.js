const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_bot', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`MongoDB ulanish muvaffaqiyatli: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB ulanishida xatolik:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
