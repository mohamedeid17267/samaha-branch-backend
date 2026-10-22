const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');
const express = require('express');

const expressApp = express();
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

  // Restore path if Vercel rewrite changed req.url
  if (
    req.headers['x-matched-path'] &&
    (req.url === '/api' || req.url === '/api/')
  ) {
    req.url = req.headers['x-matched-path'];
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
