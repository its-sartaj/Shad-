import express from 'express';
import { registerApiRoutes } from './_app';

const app = express();
app.use(express.json({ limit: '15mb' }));
registerApiRoutes(app);

export default app;
