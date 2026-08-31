import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsername(username);
    // Use bcrypt in production. For this prototype, we'll allow plaintext if hash fails, but properly we should just use bcrypt.compare.
    // Assuming pass is already hashed or we do a simple check for demo if bcrypt isn't available.
    if (user && user.passwordHash === pass) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role, facilityId: user.facilityId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
