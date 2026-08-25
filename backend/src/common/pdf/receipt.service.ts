import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Order } from '../../modules/checkout/entities/order.entity';

interface ReceiptData {
  order: Order;
  amountFormatted: string;
}

// Comprovante de pagamento em PDF gerado sob demanda apartir de um pedido aprovado
@Injectable()
export class ReceiptService {
  // monta o documento em memória (chunk por chunk) e resolve a Promise só quando terminar
  generate(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { order, amountFormatted } = data;

      doc.fontSize(20).text('Comprovante de pagamento', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#666').text('VBA Systems · Banking as a Service');
      doc.moveDown(1.5);

      doc.fillColor('#000').fontSize(12);
      const rows: [string, string][] = [
        ['Status', order.status === 'APPROVED' ? 'Aprovado' : order.status],
        ['Valor', amountFormatted],
        ['Método', order.method === 'PIX' ? 'Pix' : 'Cartão'],
        ['Referência externa', order.externalReference],
        ['ID do pedido', order.id],
      ];
      if (order.gatewayPaymentId) rows.push(['ID no gateway', order.gatewayPaymentId]);
      if (order.gatewayTxid) rows.push(['TXID Pix', order.gatewayTxid]);
      if (order.installments) rows.push(['Parcelas', `${order.installments}x`]);
      if (order.feePercent) rows.push(['Taxa aplicada', `${order.feePercent}%`]);
      rows.push(['Data', new Date(order.createdAt).toLocaleString('pt-BR')]);

      rows.forEach(([label, value]) => {
        doc
          .font('Helvetica-Bold')
          .text(`${label}: `, { continued: true })
          .font('Helvetica')
          .text(value);
        doc.moveDown(0.4);
      });

      doc.moveDown(1);
      doc
        .fontSize(9)
        .fillColor('#999')
        .text(
          'Documento gerado automaticamente pela aplicação BaaS a partir do status conciliado com o gateway Lera Box.',
        );

      doc.end();
    });
  }
}
