class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.windowMs = 60000; // 1 minute
        this.maxRequests = 30; // max requests per minute
    }

    isLimited(userId) {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];
        
        // Remove old requests
        const validRequests = userRequests.filter(time => now - time < this.windowMs);
        
        if (validRequests.length >= this.maxRequests) {
            return true;
        }

        // Add new request
        validRequests.push(now);
        this.requests.set(userId, validRequests);
        return false;
    }
}

const limiter = new RateLimiter();

const rateLimiterMiddleware = (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    if (limiter.isLimited(userId)) {
        return ctx.reply("Iltimos biroz kuting, so'rovlar soni limitdan oshib ketdi.");
    }

    return next();
};

module.exports = rateLimiterMiddleware;
