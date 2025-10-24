// // lib/redis.js
// import Redis from "ioredis";

// let redis;

// try {
//   const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

//   redis = new Redis(redisUrl, {
//     maxRetriesPerRequest: 2,
//     enableReadyCheck: false,
//     lazyConnect: true,
//   });

//   redis.on("connect", () => console.log("✅ Redis connected:", redisUrl));
//   redis.on("error", (err) => console.error("❌ Redis error:", err));
// } catch (err) {
//   console.error("⚠️ Redis initialization failed:", err);
//   redis = null;
// }

// export { redis };
