import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponse, AuthenticatedUser, JwtPayload } from './auth.types';
import { asJwtExpiresIn } from './jwt-expiry.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash },
      select: { id: true, email: true, name: true },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    
    
    const invalid = new UnauthorizedException('Invalid email or password');

    if (!user) {
      
      
      await bcrypt.compare(dto.password, `$2b$${BCRYPT_ROUNDS}$${'.'.repeat(53)}`).catch(() => false);
      throw invalid;
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw invalid;
    }

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  }

  async profile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('Token no longer valid');
    }

    return user;
  }

  private buildAuthResponse(user: AuthenticatedUser): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwt.sign(payload, {
        expiresIn: asJwtExpiresIn(
          this.config.get<string>('JWT_EXPIRES_IN', '7d'),
        ),
      }),
      user,
    };
  }
}
