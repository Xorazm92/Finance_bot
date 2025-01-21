const validateUser = (telegramId, username, lavozim) => {
    const errors = [];

    if (!telegramId || typeof telegramId !== 'number') {
        errors.push('Telegram ID noto'g'ri formatda');
    }

    if (!username || typeof username !== 'string') {
        errors.push('Username kiritilmagan');
    }

    if (!lavozim || typeof lavozim !== 'string') {
        errors.push('Lavozim kiritilmagan');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }
};

module.exports = {
    validateUser
};
