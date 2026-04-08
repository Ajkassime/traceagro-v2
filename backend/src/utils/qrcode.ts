import QRCode from 'qrcode';

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1B4332',
        light: '#FFFFFF',
      },
    });
    return qrDataUrl;
  } catch (error) {
    throw new Error('Erreur lors de la génération du QR code');
  }
}

export async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    const svg = await QRCode.toString(data, { type: 'svg' });
    return svg;
  } catch (error) {
    throw new Error('Erreur lors de la génération du QR code SVG');
  }
}
