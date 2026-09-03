import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_POSITION } from '../../common/position.util';

export class CreateTaskDto {
  @IsString()
  @MinLength(1, { message: 'Task title is required' })
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  description?: string | null;

  @IsOptional()
  @IsUUID(undefined, { message: 'assigneeId must be a valid user id' })
  assigneeId?: string | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_POSITION)
  position?: number;
}
