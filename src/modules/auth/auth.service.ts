import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RoleEnum } from '../../common/enums/role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true, branch: true },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (dto.username && dto.username.trim() !== '' && dto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: dto.username.trim() },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('اسم المستخدم مستخدم بالفعل');
      }
      user.username = dto.username.trim();
    }

    if (dto.email && dto.email.trim() !== '' && dto.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: dto.email.trim() },
      });
      if (existingEmail && existingEmail.id !== userId) {
        throw new BadRequestException('البريد الإلكتروني مستخدم بالفعل');
      }
      user.email = dto.email.trim();
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }

    const saved = await this.userRepository.save(user);
    const { password: _, ...result } = saved;
    return result;
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('يرجى إدخال كلمة المرور الحالية وكلمة المرور الجديدة');
    }

    if (dto.newPassword.length < 6) {
      throw new BadRequestException('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  async deleteUser(id: number, adminUsername: string): Promise<void> {
    if (id === 1 || id === 2) {
      throw new BadRequestException('لا يمكن حذف حساب الأدمن الرئيسي');
    }
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    if (user.username === adminUsername) {
      throw new BadRequestException('لا يمكنك حذف الحساب المسجل به حالياً');
    }
    await this.userRepository.remove(user);
  }

  async updateUser(id: number, updateDto: any): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    if (updateDto.fullName !== undefined) {
      user.fullName = updateDto.fullName;
    }
    if (updateDto.roleId !== undefined && Number(updateDto.roleId) > 0) {
      user.roleId = Number(updateDto.roleId);
    }
    if (updateDto.permissions !== undefined) {
      user.permissions = Array.isArray(updateDto.permissions) ? updateDto.permissions : [];
    }
    if (updateDto.password && String(updateDto.password).trim().length >= 4) {
      user.password = await bcrypt.hash(String(updateDto.password).trim(), 10);
    }

    const savedUser = await this.userRepository.save(user);
    const { password: _, ...result } = savedUser;
    return {
      ...result,
      permissions: this.normalizePermissions(result.permissions),
    };
  }

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
  ) { }

  private normalizePermissions(perms: any): string[] {
    if (!perms) return [];
    if (Array.isArray(perms)) {
      return perms.filter(p => p && p !== '[]' && p !== 'null' && String(p).trim() !== '');
    }
    if (typeof perms === 'string') {
      const clean = perms.trim();
      if (!clean || clean === '[]' || clean === 'null') return [];
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => p && String(p).trim() !== '');
        }
      } catch {
        return clean.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const { username, password, roleId } = registerDto;
    const cleanUsername = username.trim().toLowerCase();
    const emailToUse = registerDto.email?.trim() || `${cleanUsername}@branch.local`;
    const branchIdToUse = registerDto.branchId || 1;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email: emailToUse }, { username: cleanUsername }],
    });
    if (existingUser) {
      throw new BadRequestException('اسم المستخدم مسجل بالفعل، يرجى اختيار اسم آخر');
    }

    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException('الدور المحدد غير موجود');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      username: cleanUsername,
      email: emailToUse,
      password: hashedPassword,
      roleId,
      branchId: branchIdToUse,
      fullName: registerDto.fullName || cleanUsername,
      permissions: Array.isArray(registerDto.permissions) ? registerDto.permissions : [],
    });

    const savedUser = await this.userRepository.save(user);
    const { password: _, ...result } = savedUser;
    return {
      ...result,
      permissions: this.normalizePermissions(result.permissions),
    };
  }

  async getUsers(): Promise<any[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.branch', 'branch')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.fullName',
        'user.createdAt',
        'user.permissions',
        'role.id',
        'role.name',
        'role.description',
        'branch.id',
        'branch.name'
      ])
      .orderBy('user.id', 'ASC')
      .getMany();

    return users.map((u) => ({
      ...u,
      permissions: this.normalizePermissions(u.permissions),
    }));
  }

  async getRoles(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: Omit<User, 'password'> }> {
    const { username, password } = loginDto;
    const cleanUsername = username.trim().toLowerCase();

    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.branch', 'branch')
      .addSelect('user.password')
      .where('LOWER(user.username) = :username', { username: cleanUsername })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    const { password: _, ...result } = user;
    return {
      accessToken,
      user: {
        ...result,
        permissions: this.normalizePermissions(result.permissions),
      },
    };
  }

  async seed(): Promise<string> {
    // 1. Seed Roles
    const rolesToSeed = [
      {
        name: RoleEnum.HQ_ADMIN,
        description:
          'Central Headquarters Administrator with full global controls',
      },
      {
        name: RoleEnum.HQ_STAFF,
        description: 'HQ staff handling catalogs, orders, and logistics',
      },
      {
        name: RoleEnum.BRANCH_MANAGER,
        description: 'Manager limited to single branch operations and ledgers',
      },
    ];

    for (const r of rolesToSeed) {
      const exists = await this.roleRepository.findOne({
        where: { name: r.name },
      });
      if (!exists) {
        await this.roleRepository.save(this.roleRepository.create(r));
      }
    }

    // 2. Seed Default HQ Admin if not present
    const adminRole = await this.roleRepository.findOne({
      where: { name: RoleEnum.HQ_ADMIN },
    });
    if (adminRole) {
      const adminExists = await this.userRepository.findOne({
        where: { username: 'admin' },
      });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await this.userRepository.save(
          this.userRepository.create({
            username: 'admin',
            email: 'admin@slasel.com',
            password: hashedPassword,
            roleId: adminRole.id,
            branchId: null,
          }),
        );
      }
    }

    return 'Seeding completed: Roles and default Admin (admin/admin123) verified.';
  }
}
