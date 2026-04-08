import React, { useEffect, useState } from 'react';
import { QrCode, Download, Printer, Copy, ExternalLink, RefreshCw, Check, Smartphone, Package, Layers3, BadgeCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { APL_LOGO_LIGHT, APL_LOGO_DARK } from './aplBranding';

interface QRCodeManagerProps {
  lotId: string;
  lotNumber: string;
  qrCodeUrl?: string | null;
}

type StickerFormat = 'carton' | 'palette' | 'client';

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string,
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const downloadDataUrl = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
};

async function getAssets(qrCodeUrl: string) {
  const [qrImg, logoLight, logoDark] = await Promise.all([
    loadImage(qrCodeUrl),
    loadImage(APL_LOGO_LIGHT),
    loadImage(APL_LOGO_DARK),
  ]);
  return { qrImg, logoLight, logoDark };
}

async function buildBrandedQrDataUrl(qrCodeUrl: string, lotNumber: string, publicUrl: string) {
  const { qrImg, logoLight } = await getAssets(qrCodeUrl);

  const canvas = document.createElement('canvas');
  canvas.width = 840;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawRoundedRect(ctx, 40, 40, 760, 1020, 36, '#ffffff', '#e5e7eb');
  drawRoundedRect(ctx, 70, 70, 700, 150, 24, '#f8fafc');
  ctx.fillStyle = '#1b4332';
  ctx.fillRect(70, 198, 700, 6);

  ctx.drawImage(logoLight, 295, 78, 250, 135);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Passeport numérique APL', 420, 285);

  drawRoundedRect(ctx, 170, 330, 500, 500, 32, '#ffffff', '#d1d5db');
  ctx.drawImage(qrImg, 210, 370, 420, 420);

  ctx.fillStyle = '#1b4332';
  ctx.font = 'bold 42px Arial';
  ctx.fillText(lotNumber, 420, 900);

  ctx.fillStyle = '#b08968';
  ctx.font = '22px Arial';
  ctx.fillText('Vanilla & Spices · Authentification officielle', 420, 945);

  ctx.fillStyle = '#6b7280';
  ctx.font = '18px Arial';
  const shortUrl = publicUrl.length > 54 ? `${publicUrl.slice(0, 54)}...` : publicUrl;
  ctx.fillText(shortUrl, 420, 990);

  drawRoundedRect(ctx, 180, 1015, 480, 28, 14, '#ecfdf5');
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 15px Arial';
  ctx.fillText('APL · TraceAgro · QR dynamique certifié', 420, 1035);

  return canvas.toDataURL('image/png');
}

async function buildStickerDataUrl(format: StickerFormat, qrCodeUrl: string, lotNumber: string, publicUrl: string) {
  const { qrImg, logoLight, logoDark } = await getAssets(qrCodeUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  const shortUrl = publicUrl.length > 52 ? `${publicUrl.slice(0, 52)}...` : publicUrl;

  if (format === 'carton') {
    canvas.width = 1400;
    canvas.height = 900;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawRoundedRect(ctx, 40, 40, 1320, 820, 40, '#ffffff', '#d9e2ec');

    drawRoundedRect(ctx, 70, 70, 540, 760, 34, '#ffffff', '#d1d5db');
    ctx.drawImage(qrImg, 120, 160, 440, 440);
    drawRoundedRect(ctx, 155, 620, 370, 48, 20, '#ecfdf5');
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN CARTON', 340, 652);

    ctx.drawImage(logoLight, 710, 90, 300, 165);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 54px Arial';
    ctx.fillText('Étiquette carton', 700, 320);
    ctx.fillStyle = '#1b4332';
    ctx.font = 'bold 50px Arial';
    ctx.fillText(lotNumber, 700, 400);
    ctx.fillStyle = '#b08968';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('APL Vanilla & Spices', 700, 445);

    drawRoundedRect(ctx, 700, 495, 560, 110, 26, '#f8fafc', '#e5e7eb');
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Usage : carton individuel / colis export', 730, 545);
    ctx.fillStyle = '#6b7280';
    ctx.font = '20px Arial';
    ctx.fillText('Contrôle rapide entrepôt, réception et scan mobile', 730, 582);

    drawRoundedRect(ctx, 700, 640, 560, 145, 26, '#0f172a');
    ctx.drawImage(logoDark, 730, 668, 170, 95);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 21px Arial';
    ctx.fillText('Lien public sécurisé', 930, 707);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Arial';
    ctx.fillText(shortUrl, 930, 745);
    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('QR dynamique certifié TraceAgro', 930, 775);
  }

  if (format === 'palette') {
    canvas.width = 1200;
    canvas.height = 1200;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawRoundedRect(ctx, 55, 55, 1090, 1090, 48, '#ffffff', '#d1d5db');
    drawRoundedRect(ctx, 95, 95, 1010, 180, 30, '#0f172a');
    ctx.drawImage(logoDark, 120, 118, 260, 135);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Étiquette palette', 1040, 195);
    ctx.font = '24px Arial';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Format logistique grand volume', 1040, 235);

    drawRoundedRect(ctx, 180, 320, 840, 840, 38, '#f8fafc', '#d1d5db');
    ctx.drawImage(qrImg, 280, 420, 640, 640);

    drawRoundedRect(ctx, 250, 1015, 700, 78, 24, '#ecfdf5');
    ctx.fillStyle = '#166534';
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(lotNumber, 600, 1067);
  }

  if (format === 'client') {
    canvas.width = 1500;
    canvas.height = 1050;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1b4332');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRoundedRect(ctx, 55, 55, 1390, 940, 42, 'rgba(255,255,255,0.92)');
    drawRoundedRect(ctx, 90, 90, 1320, 210, 34, '#0f172a');
    ctx.drawImage(logoDark, 120, 120, 260, 140);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText('Export client premium', 1335, 185);
    ctx.font = '24px Arial';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('Étiquette premium pour documents, caisses et support acheteur', 1335, 228);

    drawRoundedRect(ctx, 110, 345, 520, 520, 30, '#ffffff', '#d1d5db');
    ctx.drawImage(qrImg, 150, 385, 440, 440);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 58px Arial';
    ctx.fillText(lotNumber, 700, 430);
    ctx.fillStyle = '#1b4332';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('APL Vanilla & Spices · Madagascar', 700, 485);

    drawRoundedRect(ctx, 700, 535, 620, 110, 24, '#ecfdf5', '#bbf7d0');
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('QR dynamique · Authentification officielle', 735, 585);
    ctx.fillStyle = '#334155';
    ctx.font = '20px Arial';
    ctx.fillText('Scan acheteur, douane, audit qualité ou vérification terrain', 735, 620);

    drawRoundedRect(ctx, 700, 680, 620, 150, 24, '#f8fafc', '#d1d5db');
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Lien public', 735, 725);
    ctx.fillStyle = '#64748b';
    ctx.font = '20px Arial';
    ctx.fillText(shortUrl, 735, 762);
    ctx.fillStyle = '#b08968';
    ctx.font = 'bold 21px Arial';
    ctx.fillText('Design premium prêt pour export client', 735, 805);

    drawRoundedRect(ctx, 700, 865, 620, 72, 20, '#0f172a');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('TraceAgro × APL · Vanilla & Spices', 735, 910);
  }

  return canvas.toDataURL('image/png');
}

export const QRCodeManager: React.FC<QRCodeManagerProps> = ({ lotId, lotNumber, qrCodeUrl }) => {
  const [copied, setCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [stickerLoading, setStickerLoading] = useState<StickerFormat | null>(null);
  const qc = useQueryClient();

  const publicUrl = `${window.location.origin}/lot-public/${lotId}`;

  useEffect(() => {
    setImageFailed(false);
  }, [qrCodeUrl]);

  const regenMut = useMutation({
    mutationFn: () => api.put(`/lots/${lotId}`, { regenerateQr: true }),
    onSuccess: () => {
      toast.success('QR Code APL régénéré ✅');
      qc.invalidateQueries({ queryKey: ['lot', lotId] });
    },
    onError: () => toast.error('Erreur lors de la régénération'),
  });

  const copyUrl = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('URL copiée !');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPng = async () => {
    if (!qrCodeUrl) return;
    try {
      setDownloading(true);
      const brandedPng = await buildBrandedQrDataUrl(qrCodeUrl, lotNumber, publicUrl);
      downloadDataUrl(brandedPng, `APL_QR_${lotNumber}.png`);
      toast.success('QR branding APL téléchargé');
    } catch {
      downloadDataUrl(qrCodeUrl, `QR_${lotNumber}.png`);
      toast.success('QR téléchargé');
    } finally {
      setDownloading(false);
    }
  };

  const exportSticker = async (format: StickerFormat) => {
    if (!qrCodeUrl) return;
    try {
      setStickerLoading(format);
      const png = await buildStickerDataUrl(format, qrCodeUrl, lotNumber, publicUrl);
      const suffix = format === 'carton' ? 'sticker-carton' : format === 'palette' ? 'sticker-palette' : 'sticker-export-client';
      downloadDataUrl(png, `APL_${suffix}_${lotNumber}.png`);
      toast.success(`Sticker ${format} exporté ✅`);
    } catch {
      toast.error('Erreur lors de la génération du sticker');
    } finally {
      setStickerLoading(null);
    }
  };

  const printQr = async () => {
    if (!qrCodeUrl) return;
    try {
      const brandedPng = await buildBrandedQrDataUrl(qrCodeUrl, lotNumber, publicUrl);
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`
        <html>
          <head>
            <title>QR Code APL – ${lotNumber}</title>
            <style>
              body { margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f3f4f6; font-family: Arial, sans-serif; }
              .sheet { background: white; border-radius: 22px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
              img { width: 420px; max-width: 100%; height: auto; display: block; }
              .meta { margin-top: 10px; text-align: center; color: #6b7280; font-size: 12px; }
              @page { margin: 10mm; }
            </style>
          </head>
          <body>
            <div class="sheet">
              <img src="${brandedPng}" />
              <div class="meta">APL Vanilla & Spices · TraceAgro Madagascar</div>
            </div>
            <script>window.onload = () => window.print();</script>
          </body>
        </html>
      `);
      win.document.close();
    } catch {
      toast.error('Impossible de préparer l’impression');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        {qrCodeUrl && !imageFailed ? (
          <div className="w-full max-w-[320px] rounded-3xl bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] border border-black/5">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-200">
              <img src={APL_LOGO_LIGHT} alt="Logo APL" className="h-16 mx-auto object-contain" />
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 p-3 bg-white">
              <img
                src={qrCodeUrl}
                alt={`QR ${lotNumber}`}
                className="w-full h-auto aspect-square rounded-xl"
                onError={() => setImageFailed(true)}
              />
            </div>
            <div className="mt-3 text-center">
              <p className="font-mono text-base font-bold text-[#1b4332]">{lotNumber}</p>
              <p className="text-[11px] text-[#b08968] font-medium mt-1">APL · Vanilla & Spices</p>
            </div>
          </div>
        ) : (
          <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
            <QrCode size={40} className="text-gray-600" />
            <p className="text-xs text-gray-500 text-center">
              {imageFailed ? 'QR invalide ou corrompu' : 'QR non généré'}
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <Smartphone size={11} />
          <span className="truncate max-w-[220px]">{publicUrl}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="primary"
          size="sm"
          icon={<Download size={13} />}
          onClick={downloadPng}
          disabled={!qrCodeUrl || downloading}
          className="w-full justify-center"
        >
          {downloading ? 'Préparation…' : 'PNG APL'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          icon={<Printer size={13} />}
          onClick={printQr}
          disabled={!qrCodeUrl}
          className="w-full justify-center"
        >Imprimer</Button>

        <Button
          variant="secondary"
          size="sm"
          icon={copied ? <Check size={13} className="text-forest-400" /> : <Copy size={13} />}
          onClick={copyUrl}
          className="w-full justify-center"
        >{copied ? 'Copié !' : 'Copier URL'}</Button>

        <Button
          variant="ghost"
          size="sm"
          icon={<ExternalLink size={13} />}
          onClick={() => window.open(`/lot-public/${lotId}`, '_blank')}
          className="w-full justify-center"
        >Aperçu</Button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">QR Sticker Export</p>
          <p className="text-xs text-gray-500">3 formats prêts à imprimer pour carton, palette et export client.</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Package size={13} />}
            onClick={() => exportSticker('carton')}
            disabled={!qrCodeUrl || stickerLoading !== null}
            className="w-full justify-center"
          >
            {stickerLoading === 'carton' ? 'Préparation carton…' : 'Étiquette carton'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Layers3 size={13} />}
            onClick={() => exportSticker('palette')}
            disabled={!qrCodeUrl || stickerLoading !== null}
            className="w-full justify-center"
          >
            {stickerLoading === 'palette' ? 'Préparation palette…' : 'Étiquette palette'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<BadgeCheck size={13} />}
            onClick={() => exportSticker('client')}
            disabled={!qrCodeUrl || stickerLoading !== null}
            className="w-full justify-center"
          >
            {stickerLoading === 'client' ? 'Préparation export client…' : 'Export client premium'}
          </Button>
        </div>
      </div>

      {imageFailed && (
        <div className="text-xs p-3 rounded-xl space-y-1" style={{ background: '#7f1d1d20', border: '1px solid #ef444430' }}>
          <p className="text-red-400 font-medium">⚠️ QR code invalide détecté</p>
          <p style={{ color: '#9ca3af' }}>
            Le lot contient une ancienne image ou un placeholder. Cliquez sur « Régénérer le QR Code » pour le réparer.
          </p>
        </div>
      )}

      <button
        onClick={() => regenMut.mutate()}
        disabled={regenMut.isPending}
        className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg transition-colors"
        style={{ color: '#6e7681', background: 'transparent', border: '1px dashed rgba(255,255,255,0.08)' }}
      >
        <RefreshCw size={12} className={cn(regenMut.isPending && 'animate-spin')} />
        {regenMut.isPending ? 'Régénération...' : 'Régénérer le QR Code'}
      </button>

      <div className="rounded-2xl overflow-hidden border border-white/10">
        <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-center">
          <img src={APL_LOGO_DARK} alt="Logo APL sombre" className="h-12 object-contain" />
        </div>
        <div className="text-xs p-3 space-y-1" style={{ background: '#1b433210', borderTop: '1px solid #2d6a4f30' }}>
          <p className="text-[#52b788] font-medium">✨ Branding APL actif</p>
          <p style={{ color: '#6e7681' }}>
            Le QR est présenté avec l’identité visuelle APL et les exports PNG utilisent aussi ce branding premium.
          </p>
        </div>
      </div>
    </div>
  );
};
