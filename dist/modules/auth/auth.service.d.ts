import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthService {
    private userRepository;
    private roleRepository;
    private jwtService;
    updateProfile(userId: number, dto: UpdateProfileDto): Promise<Omit<User, 'password'>>;
    changePassword(userId: number, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    deleteUser(id: number, adminUsername: string): Promise<void>;
    updateUser(id: number, updateDto: any): Promise<Omit<User, 'password'>>;
    constructor(userRepository: Repository<User>, roleRepository: Repository<Role>, jwtService: JwtService);
    private normalizePermissions;
    register(registerDto: RegisterDto): Promise<Omit<User, 'password'>>;
    getUsers(): Promise<any[]>;
    getRoles(): Promise<Role[]>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: Omit<User, 'password'>;
    }>;
    seed(): Promise<string>;
}
