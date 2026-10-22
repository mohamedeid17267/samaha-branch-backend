"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../../database/entities/user.entity");
const role_entity_1 = require("../../database/entities/role.entity");
const role_enum_1 = require("../../common/enums/role.enum");
let AuthService = class AuthService {
    userRepository;
    roleRepository;
    jwtService;
    async updateProfile(userId, dto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: { role: true, branch: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        if (dto.username && dto.username.trim() !== '' && dto.username !== user.username) {
            const existingUser = await this.userRepository.findOne({
                where: { username: dto.username.trim() },
            });
            if (existingUser && existingUser.id !== userId) {
                throw new common_1.BadRequestException('اسم المستخدم مستخدم بالفعل');
            }
            user.username = dto.username.trim();
        }
        if (dto.email && dto.email.trim() !== '' && dto.email !== user.email) {
            const existingEmail = await this.userRepository.findOne({
                where: { email: dto.email.trim() },
            });
            if (existingEmail && existingEmail.id !== userId) {
                throw new common_1.BadRequestException('البريد الإلكتروني مستخدم بالفعل');
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
    async changePassword(userId, dto) {
        if (!dto.currentPassword || !dto.newPassword) {
            throw new common_1.BadRequestException('يرجى إدخال كلمة المرور الحالية وكلمة المرور الجديدة');
        }
        if (dto.newPassword.length < 6) {
            throw new common_1.BadRequestException('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
        }
        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id: userId })
            .getOne();
        if (!user) {
            throw new common_1.NotFoundException('المستخدم غير موجود');
        }
        const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isMatch) {
            throw new common_1.BadRequestException('كلمة المرور الحالية غير صحيحة');
        }
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        user.password = hashedPassword;
        await this.userRepository.save(user);
        return { message: 'تم تغيير كلمة المرور بنجاح' };
    }
    async deleteUser(id, adminUsername) {
        if (id === 1 || id === 2) {
            throw new common_1.BadRequestException('لا يمكن حذف حساب الأدمن الرئيسي');
        }
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('المستخدم غير موجود');
        if (user.username === adminUsername) {
            throw new common_1.BadRequestException('لا يمكنك حذف الحساب المسجل به حالياً');
        }
        await this.userRepository.remove(user);
    }
    async updateUser(id, updateDto) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('المستخدم غير موجود');
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
    constructor(userRepository, roleRepository, jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jwtService = jwtService;
    }
    normalizePermissions(perms) {
        if (!perms)
            return [];
        if (Array.isArray(perms)) {
            return perms.filter(p => p && p !== '[]' && p !== 'null' && String(p).trim() !== '');
        }
        if (typeof perms === 'string') {
            const clean = perms.trim();
            if (!clean || clean === '[]' || clean === 'null')
                return [];
            try {
                const parsed = JSON.parse(clean);
                if (Array.isArray(parsed)) {
                    return parsed.filter(p => p && String(p).trim() !== '');
                }
            }
            catch {
                return clean.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        return [];
    }
    async register(registerDto) {
        const { username, password, roleId } = registerDto;
        const cleanUsername = username.trim().toLowerCase();
        const emailToUse = registerDto.email?.trim() || `${cleanUsername}@branch.local`;
        const branchIdToUse = registerDto.branchId || 1;
        const existingUser = await this.userRepository.findOne({
            where: [{ email: emailToUse }, { username: cleanUsername }],
        });
        if (existingUser) {
            throw new common_1.BadRequestException('اسم المستخدم مسجل بالفعل، يرجى اختيار اسم آخر');
        }
        const role = await this.roleRepository.findOne({ where: { id: roleId } });
        if (!role) {
            throw new common_1.BadRequestException('الدور المحدد غير موجود');
        }
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
    async getUsers() {
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
    async getRoles() {
        return this.roleRepository.find();
    }
    async login(loginDto) {
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
            throw new common_1.UnauthorizedException('بيانات الدخول غير صحيحة');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('بيانات الدخول غير صحيحة');
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
    async seed() {
        const rolesToSeed = [
            {
                name: role_enum_1.RoleEnum.HQ_ADMIN,
                description: 'Central Headquarters Administrator with full global controls',
            },
            {
                name: role_enum_1.RoleEnum.HQ_STAFF,
                description: 'HQ staff handling catalogs, orders, and logistics',
            },
            {
                name: role_enum_1.RoleEnum.BRANCH_MANAGER,
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
        const adminRole = await this.roleRepository.findOne({
            where: { name: role_enum_1.RoleEnum.HQ_ADMIN },
        });
        if (adminRole) {
            const adminExists = await this.userRepository.findOne({
                where: { username: 'admin' },
            });
            if (!adminExists) {
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await this.userRepository.save(this.userRepository.create({
                    username: 'admin',
                    email: 'admin@slasel.com',
                    password: hashedPassword,
                    roleId: adminRole.id,
                    branchId: null,
                }));
            }
        }
        return 'Seeding completed: Roles and default Admin (admin/admin123) verified.';
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map