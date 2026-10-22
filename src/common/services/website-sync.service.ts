import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebsiteSyncService {
  private readonly logger = new Logger(WebsiteSyncService.name);

  /**
   * Sync stock quantity for a given SKU to Linea website.
   * Runs non-blocking (async fire-and-forget), never throws or slows down POS / ERP.
   */
  async syncStock(
    sku: string,
    newStock: number,
    extra?: { price?: number; wholesalePrice?: number },
  ): Promise<void> {
    if (!sku) return;

    const rawUrl = process.env.LINEA_WEBSITE_URL || 'http://127.0.0.1:3005';
    const secret = process.env.LINEA_SYNC_SECRET || 'samaha-linea-sync-key-2026';

    // Build URL candidates to bypass any macOS localhost IPv6 resolution delays
    const urlsToTry: string[] = [rawUrl];
    if (rawUrl.includes('localhost')) {
      urlsToTry.push(rawUrl.replace('localhost', '127.0.0.1'));
    } else if (rawUrl.includes('127.0.0.1')) {
      urlsToTry.push(rawUrl.replace('127.0.0.1', 'localhost'));
    }

    const payload = {
      sku: sku.trim(),
      stock: Math.max(0, Number(newStock ?? 0)),
      price: extra?.price !== undefined && !isNaN(Number(extra.price)) ? Number(extra.price) : undefined,
      wholesalePrice: extra?.wholesalePrice !== undefined && !isNaN(Number(extra.wholesalePrice)) ? Number(extra.wholesalePrice) : undefined,
    };

    let synced = false;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 2 && !synced; attempt++) {
      for (const targetBase of urlsToTry) {
        try {
          const response = await fetch(`${targetBase}/api/webhooks/stock-sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-sync-secret': secret,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000), // Generous 10s timeout to allow MongoDB Atlas roundtrip
          });

          if (response.ok) {
            const data = (await response.json().catch(() => null)) as any;
            if (data?.found) {
              this.logger.log(
                `[Website Sync] SKU [${sku}] successfully synced to Linea! Stock: ${data.newStock} (${data.status})`,
              );
            } else {
              this.logger.log(
                `[Website Sync] Webhook responded: SKU [${sku}] not currently published on website`,
              );
            }
            synced = true;
            break;
          } else {
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (err: any) {
          lastError = err;
        }
      }

      if (!synced && attempt === 1) {
        // Wait 500ms before second attempt
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!synced && lastError) {
      this.logger.warn(
        `[Website Sync] Could not sync SKU [${sku}] to Linea website after retries: ${lastError.message}`,
      );
    }
  }

  /**
   * Batch sync multiple items
   */
  async syncMultiple(items: { sku: string; stock: number }[]): Promise<void> {
    if (!items || items.length === 0) return;
    for (const item of items) {
      await this.syncStock(item.sku, item.stock);
    }
  }
}
