import { IsIn } from 'class-validator';
import { SHAREABLE_ROLES, ShareableRole } from './add-board-member.dto';

export class UpdateBoardMemberDto {
  @IsIn(SHAREABLE_ROLES, {
    message: 'Role must be either EDITOR or VIEWER',
  })
  role!: ShareableRole;
}
