import { Transform } from 'class-transformer';
import { IsEmail, IsIn } from 'class-validator';
import { BoardRole } from '@prisma/client';

export const SHAREABLE_ROLES = [BoardRole.EDITOR, BoardRole.VIEWER] as const;
export type ShareableRole = (typeof SHAREABLE_ROLES)[number];

export class AddBoardMemberDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsIn(SHAREABLE_ROLES, {
    message: 'Role must be either EDITOR or VIEWER',
  })
  role!: ShareableRole;
}
