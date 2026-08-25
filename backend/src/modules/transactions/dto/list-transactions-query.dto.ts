import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TransactionType } from '../entities/transaction.entity';

export class ListTransactionsQueryDto {
  @ApiPropertyOptional({
    description: 'Status local (ex.: APPROVED, DENIED, EXPIRED, CANCELLED, PENDING)',
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsIn(Object.values(TransactionType))
  type?: TransactionType;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser pelo menos 1.' })
  @Max(200, { message: 'O limite máximo é 200.' })
  limit?: number;
}
