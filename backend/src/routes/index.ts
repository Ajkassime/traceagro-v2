import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { productsRoutes } from '../modules/products/products.routes';
import { lotsRoutes } from '../modules/lots/lots.routes';
import { producersRoutes } from '../modules/producers/producers.routes';
import { shipmentsRoutes } from '../modules/shipments/shipments.routes';
import { documentsRoutes } from '../modules/documents/documents.routes';
import { intelligenceRoutes } from '../modules/intelligence/intelligence.routes';
import { notificationsRoutes } from '../modules/notifications/notifications.routes';
import { conditioningRoutes } from '../modules/conditioning/conditioning.routes';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/products', productsRoutes);
router.use('/lots', lotsRoutes);
router.use('/producers', producersRoutes);
router.use('/shipments', shipmentsRoutes);
router.use('/documents', documentsRoutes);
router.use('/intelligence', intelligenceRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/conditioning', conditioningRoutes);

router.get('/', (_req, res) => {
  res.json({ message: 'TraceAgro API v2.0', docs: '/api/docs' });
});
