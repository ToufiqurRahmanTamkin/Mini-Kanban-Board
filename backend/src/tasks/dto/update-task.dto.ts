import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Task title cannot be empty' })
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  description?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUUID(undefined, { message: 'assigneeId must be a valid user id or null' })
  assigneeId?: string | null;
}
