import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus, PaymentMethod } from '../../../common/enums/order-status.enum';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description:
      'Sucesso=APPROVED, Falha=DENIED, Expirado=EXPIRED, Cancelado=CANCELLED, Pendente=PENDING',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Filtro de status inválido.' })
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Filtro de método inválido.' })
  method?: PaymentMethod;
}
