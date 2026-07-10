import 'dotenv/config';
import { createApp } from './server/app.js';
import { startServer } from './server/startup.js';

const app = createApp();
startServer(app);
