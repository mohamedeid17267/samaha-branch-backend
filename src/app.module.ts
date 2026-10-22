import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import modules
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ActivityModule } from './modules/activity/activity.module';
import { PosModule } from './modules/pos/pos.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MainOfficeModule } from './modules/main-office/main-office.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CategoriesModule } from './modules/categories/categories.module';

import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configure Environment Variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Schedule Module (disabled in serverless Vercel environment)
    ...(Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV)
      ? []
      : [ScheduleModule.forRoot()]),

    // Shared global caching and utilities
    CommonModule,

    // Configure TypeORM MySQL Connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isVercel =
          Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
        const host = configService.get<string>(
          'DB_HOST',
          isVercel ? 'gateway01.eu-central-1.prod.aws.tidbcloud.com' : '127.0.0.1'
        );
        const dbPort = Number(
          configService.get<number>(
            'DB_PORT',
            isVercel || host.includes('tidbcloud.com') ? 4000 : 3304
          )
        );
        const dbUser = configService.get<string>(
          'DB_USERNAME',
          isVercel || host.includes('tidbcloud.com') ? '4AjRseKqFzqFjBd.root' : 'root'
        );
        const dbPass = configService.get<string>(
          'DB_PASSWORD',
          isVercel || host.includes('tidbcloud.com') ? 'yiyeZtirfIBFl1cV' : ''
        );
        const dbName = configService.get<string>(
          'DB_DATABASE',
          isVercel || host.includes('tidbcloud.com') ? 'test' : 'slasel'
        );
        const isTiDB = host.includes('tidbcloud.com');
        const useSsl = configService.get<string>('DB_SSL') === 'true' || isTiDB;

        return {
          type: 'mysql',
          host,
          port: dbPort,
          username: dbUser,
          password: dbPass,
          database: dbName,
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
          ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : false,
          extra: {
            connectionLimit: isVercel ? 5 : 20,
            waitForConnections: true,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            connectTimeout: 60000,
          },
        };
      },
    }),

    // Features Modules
    AuthModule,
    BranchesModule,
    ProductsModule,
    OrdersModule,
    FinanceModule,
    ActivityModule,
    PosModule,
    CustomersModule,
    ReportsModule,
    MainOfficeModule,
    SuppliersModule,
    CategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
