import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from '../../database/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    deleteUser(id: string, req: any): Promise<{
        message: string;
    }>;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: Omit<User, "password">;
    }>;
    register(registerDto: RegisterDto): Promise<Omit<User, "password">>;
    updateUser(id: string, updateDto: any): Promise<Omit<User, "password">>;
    seed(): Promise<string>;
    getUsers(): Promise<any[]>;
    getRoles(): Promise<import("../../database/entities/role.entity").Role[]>;
    getProfile(user: User): Promise<User>;
    updateProfile(user: User, updateDto: UpdateProfileDto): Promise<Omit<User, "password">>;
    changePassword(user: User, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
}
