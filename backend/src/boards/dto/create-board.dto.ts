import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(1, { message: 'Board title is required' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  description?: string | null;
}
