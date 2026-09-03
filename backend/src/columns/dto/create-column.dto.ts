import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_POSITION } from '../../common/position.util';

export class CreateColumnDto {
  @IsString()
  @MinLength(1, { message: 'Column title is required' })
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_POSITION)
  position?: number;
}
