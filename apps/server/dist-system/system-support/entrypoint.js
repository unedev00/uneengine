import { startSystemServer } from './server.js';
startSystemServer().catch((error) => {
    console.error('SQL system runtime failed startup:', error);
    process.exitCode = 1;
});
