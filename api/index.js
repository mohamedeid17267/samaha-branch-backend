const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');
const express = require('express');
const mysql = require('mysql2/promise');

const expressApp = express();

// Handle body parsing safely without hanging on Vercel stream
expressApp.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  express.json()(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true })(req, res, next);
  });
});

let isReady = false;
let initPromise = null;

async function bootstrap() {
  if (isReady) return expressApp;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let AppModule;
    try {
      AppModule = require('../dist/app.module').AppModule;
    } catch (e1) {
      try {
        AppModule = require('./dist/app.module').AppModule;
      } catch (e2) {
        AppModule = require('../src/app.module').AppModule;
      }
    }

    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { bodyParser: false },
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'X-CSRF-Token',
      ],
      credentials: true,
    });

    await app.init();
    isReady = true;
    return expressApp;
  })();

  return initPromise;
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,PATCH,DELETE,POST,PUT'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Diagnostics: Instant debug response
  if (req.url && req.url.includes('debug=1')) {
    return res.status(200).json({
      status: 'ok',
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
  }

  // Diagnostics: Instant database connection test
  if (req.url && req.url.includes('test-db=1')) {
    try {
      const conn = await mysql.createConnection({
        host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
        port: 4000,
        user: '4AjRseKqFzqFjBd.root',
        password: 'yiyeZtirfIBFl1cV',
        database: 'test',
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
        connectTimeout: 5000,
      });
      const [rows] = await conn.execute('SELECT 1 as test');
      await conn.end();
      return res.status(200).json({ dbConnected: true, rows });
    } catch (err) {
      return res.status(500).json({
        dbConnected: false,
        error: err.message,
        code: err.code,
      });
    }
  }

  // Route URL restoration
  const realPath =
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.url;

  if (realPath && realPath !== '/api' && !realPath.startsWith('/api?')) {
    req.url = realPath;
  }

  try {
    const handler = await bootstrap();
    return handler(req, res);
  } catch (err) {
    console.error('Serverless Execution Error:', err);
    return res.status(500).json({
      error: 'Serverless Execution Error',
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : undefined,
    });
  }
};
