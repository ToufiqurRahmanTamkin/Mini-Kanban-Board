import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateColumnDto {
  @IsString()
  @MinLength(1, { message: 'Column title is required' })
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;
}
