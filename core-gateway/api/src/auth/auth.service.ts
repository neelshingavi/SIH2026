import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsername(username);
    if (!user) return null;

    // SECURITY: Always use bcrypt.compare — never plaintext comparison.
    const passwordMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!passwordMatch) return null;

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      facilityId: user.facilityId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      facilityId: user.facilityId,
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, ...profile } = user;
    return profile;
  }
}
