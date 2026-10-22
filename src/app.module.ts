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

    // Schedule Module
    ScheduleModule.forRoot(),

    // Shared global caching and utilities
    CommonModule,

    // Configure TypeORM MySQL Connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST', '127.0.0.1');
        const dbSsl = configService.get<string>('DB_SSL');
        const isTiDB = host.includes('tidbcloud.com');
        const useSsl = dbSsl === 'true' || isTiDB;

        return {
          type: 'mysql',
          host,
          port: Number(configService.get<number>('DB_PORT', 3304)),
          username: configService.get<string>('DB_USERNAME', 'root'),
          password: configService.get<string>('DB_PASSWORD', ''),
          database: configService.get<string>('DB_DATABASE', 'slasel'),
          autoLoadEntities: true,
          synchronize: configService.get<string>('DB_SYNCHRONIZE', isTiDB ? 'false' : 'true') === 'true',
          logging: false,
          ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : false,
          extra: {
            connectionLimit: 20,
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
