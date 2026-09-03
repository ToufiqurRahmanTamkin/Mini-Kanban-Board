import { IsNumber, IsUUID, Max, Min } from 'class-validator';
import { MAX_POSITION } from '../../common/position.util';

export class MoveTaskDto {
  @IsUUID(undefined, { message: 'targetColumnId must be a valid column id' })
  targetColumnId!: string;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'targetPosition must be a finite number' },
  )
  @Min(0, { message: 'targetPosition must not be negative' })
  @Max(MAX_POSITION, { message: 'targetPosition is out of range' })
  targetPosition!: number;
}
