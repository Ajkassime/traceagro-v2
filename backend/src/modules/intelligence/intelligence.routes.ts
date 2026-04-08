import { Router } from 'express';
import { intelligenceController } from './intelligence.controller';
import { authenticate } from '../../middleware/auth';

export const intelligenceRoutes = Router();

intelligenceRoutes.use(authenticate);
intelligenceRoutes.get('/insights', intelligenceController.getInsights.bind(intelligenceController));
intelligenceRoutes.get('/anomalies', intelligenceController.getAnomalies.bind(intelligenceController));
intelligenceRoutes.get('/trends', intelligenceController.getTrends.bind(intelligenceController));
intelligenceRoutes.get('/producer-ranking', intelligenceController.getProducerRanking.bind(intelligenceController));
intelligenceRoutes.post('/ask', intelligenceController.askAssistant.bind(intelligenceController));
