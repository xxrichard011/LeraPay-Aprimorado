import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// DTO base de paginação. Os DTOs de query de cada lista (orders, links, statement)
// estendem esse aqui pra ganhar "page" e "pageSize" de graça.
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, description: 'Número da página (começa em 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser pelo menos 1.' })
  page?: number;

  @ApiPropertyOptional({ default: 10, description: 'Quantidade de itens por página (máximo 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O tamanho da página deve ser um número inteiro.' })
  @Min(1, { message: 'O tamanho da página deve ser pelo menos 1.' })
  @Max(100, { message: 'O tamanho máximo da página é 100.' })
  pageSize?: number;
}
