import QRCode from 'qrcode';

// Gera a imagem do QR Pix local a partir do payload EMV (BR Code) 
export async function generateEmvQrCodeDataUrl(emv: string): Promise<string> {
  return QRCode.toDataURL(emv, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
}
