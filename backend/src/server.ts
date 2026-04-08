import { app } from './app';
import { config } from './config';
import { prisma } from './utils/prisma';

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Base de données connectée');

    app.listen(config.port, () => {
      console.log(`🚀 TraceAgro API v2 démarrée sur http://localhost:${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});
