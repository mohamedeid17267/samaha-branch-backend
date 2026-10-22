require('reflect-metadata');

// Ensure Vercel NFT bundles database drivers
try {
  require('mysql2');
} catch (_) {}

let AppModule;
let loadError = null;

try {
  AppModule = require('../dist/app.module').AppModule;
} catch (e) {
  loadError = e;
}

let server;
let initPromise;

async function bootstrap() {
  if (server) return server;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (loadError) {
      throw new Error(`Failed to load dist/app.module: ${loadError.message}\n${loadError.stack}`);
    }

    const { NestFactory } = require('@nestjs/core');
    const { ExpressAdapter } = require('@nestjs/platform-express');
    const { ValidationPipe } = require('@nestjs/common');
    const express = require('express');

    const expressApp = express();

    // Body parsing middleware safe for serverless
    expressApp.use((req, res, next) => {
      if (req.body && typeof req.body === 'object') {
        return next();
      }
      express.json()(req, res, (err) => {
        if (err) return next(err);
        express.urlencoded({ extended: true })(req, res, next);
      });
    });

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
    server = expressApp;
    return server;
  })();

  return initPromise;
}

module.exports = async (req, res) => {
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

  // Instant Health Check
  if (req.url && req.url.includes('ping')) {
    return res.status(200).json({
      ok: true,
      appModuleLoaded: Boolean(AppModule),
      loadError: loadError
        ? { message: loadError.message, stack: loadError.stack }
        : null,
      node: process.version,
    });
  }

  // Restore path from Vercel rewrites
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
      error: 'Vercel Serverless Initialization Error',
      message: err.message,
      stack: err.stack,
    });
  }
};
