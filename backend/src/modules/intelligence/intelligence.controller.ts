import { Request, Response } from 'express';
import { intelligenceService } from './intelligence.service';
import { sendSuccess, sendError } from '../../utils/response';

export class IntelligenceController {
  async getInsights(_req: Request, res: Response) {
    try {
      const insights = await intelligenceService.generateInsights();
      return sendSuccess(res, insights);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async getAnomalies(_req: Request, res: Response) {
    try {
      const anomalies = await intelligenceService.detectAnomalies();
      return sendSuccess(res, anomalies);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async getTrends(_req: Request, res: Response) {
    try {
      const trends = await intelligenceService.getTrends();
      return sendSuccess(res, trends);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async getProducerRanking(_req: Request, res: Response) {
    try {
      const ranking = await intelligenceService.getProducerRanking();
      return sendSuccess(res, ranking);
    } catch (err: any) { return sendError(res, err.message, 500); }
  }

  async askAssistant(req: Request, res: Response) {
    try {
      const { question } = req.body;
      if (!question) return sendError(res, 'Question manquante', 400);
      const answer = await intelligenceService.askAssistant(question);
      return sendSuccess(res, { answer });
    } catch (err: any) { return sendError(res, err.message, 500); }
  }
}

export const intelligenceController = new IntelligenceController();
