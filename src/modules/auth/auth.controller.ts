import { Controller, Req, Delete, Param, Request, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('auth')
export class AuthController {

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.BRANCH_MANAGER, RoleEnum.SUPER_ADMIN)
  async deleteUser(@Param('id') id: string, @Req() req) {
    await this.authService.deleteUser(+id, req.user?.username || 'admin');
    return { message: 'تم حذف المستخدم بنجاح' };
  }

  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.BRANCH_MANAGER, RoleEnum.SUPER_ADMIN)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.BRANCH_MANAGER, RoleEnum.SUPER_ADMIN)
  async updateUser(@Param('id') id: string, @Body() updateDto: any) {
    return this.authService.updateUser(+id, updateDto);
  }

  @Post('seed')
  async seed() {
    return this.authService.seed();
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.HQ_ADMIN, RoleEnum.BRANCH_MANAGER, RoleEnum.SUPER_ADMIN)
  async getUsers() {
    return this.authService.getUsers();
  }

  @Get('roles')
  async getRoles() {
    return this.authService.getRoles();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: User) {
    return user;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@GetUser() user: User, @Body() updateDto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, updateDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@GetUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }
}
