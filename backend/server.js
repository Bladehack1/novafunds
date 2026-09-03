const app = require('./src/app');
const env = require('./src/config/env');
const db = require('./src/config/database');

const startServer = async () => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log('✅ Database connected successfully');

    app.listen(env.port, () => {
      console.log(`🚀 Server running in ${env.nodeEnv} mode on port ${env.port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
