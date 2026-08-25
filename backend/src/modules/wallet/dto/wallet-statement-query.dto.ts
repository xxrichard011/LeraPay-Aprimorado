import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class WalletStatementQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Status conforme o gateway (ex.: APPROVED, DENIED, EXPIRED, CANCELLED)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Tipo conforme o gateway (ex.: PIX, CARD, WITHDRAWAL)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    default: 200,
    description:
      'Quantas transações buscar no gateway antes de paginar (não confundir com "pageSize", que é o tamanho da página exibida)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser pelo menos 1.' })
  @Max(200, { message: 'O limite máximo é 200.' })
  limit?: number;
}
