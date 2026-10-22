"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./modules/auth/auth.module");
const branches_module_1 = require("./modules/branches/branches.module");
const products_module_1 = require("./modules/products/products.module");
const orders_module_1 = require("./modules/orders/orders.module");
const finance_module_1 = require("./modules/finance/finance.module");
const activity_module_1 = require("./modules/activity/activity.module");
const pos_module_1 = require("./modules/pos/pos.module");
const customers_module_1 = require("./modules/customers/customers.module");
const reports_module_1 = require("./modules/reports/reports.module");
const main_office_module_1 = require("./modules/main-office/main-office.module");
const suppliers_module_1 = require("./modules/suppliers/suppliers.module");
const categories_module_1 = require("./modules/categories/categories.module");
const common_module_1 = require("./common/common.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            schedule_1.ScheduleModule.forRoot(),
            common_module_1.CommonModule,
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const host = configService.get('DB_HOST', '127.0.0.1');
                    const dbSsl = configService.get('DB_SSL');
                    const isTiDB = host.includes('tidbcloud.com');
                    const useSsl = dbSsl === 'true' || isTiDB;
                    return {
                        type: 'mysql',
                        host,
                        port: Number(configService.get('DB_PORT', 3304)),
                        username: configService.get('DB_USERNAME', 'root'),
                        password: configService.get('DB_PASSWORD', ''),
                        database: configService.get('DB_DATABASE', 'slasel'),
                        autoLoadEntities: true,
                        synchronize: configService.get('DB_SYNCHRONIZE', isTiDB ? 'false' : 'true') === 'true',
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
            auth_module_1.AuthModule,
            branches_module_1.BranchesModule,
            products_module_1.ProductsModule,
            orders_module_1.OrdersModule,
            finance_module_1.FinanceModule,
            activity_module_1.ActivityModule,
            pos_module_1.PosModule,
            customers_module_1.CustomersModule,
            reports_module_1.ReportsModule,
            main_office_module_1.MainOfficeModule,
            suppliers_module_1.SuppliersModule,
            categories_module_1.CategoriesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map