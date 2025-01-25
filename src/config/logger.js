const winston = require('winston');
const path = require('path');

// Logger konfiguratsiyasi
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
    ),
    transports: [
        // Xatolarni faylga yozish
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), 
            level: 'error'
        }),
        // Barcha log yozuvlarni faylga yozish
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/combined.log')
        }),
        // Konsolga chiqarish
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

module.exports = logger;
