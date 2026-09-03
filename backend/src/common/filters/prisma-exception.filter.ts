import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Unexpected database error';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        message = target
          ? `A record with this ${target} already exists`
          : 'A record with these values already exists';
        break;
      }
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Referenced record does not exist';
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;
      default:
        this.logger.error(
          `Unhandled Prisma error ${exception.code}: ${exception.message}`,
        );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }
}
