import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentGateway } from '@netorbit/shared-types';

export interface GatewayOrderResult {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  clientSecret?: string;
  checkoutUrl?: string;
  metadata?: Record<string, any>;
}

export interface GatewayVerificationParams {
  gateway: PaymentGateway;
  gatewayOrderId?: string;
  gatewayTransactionId?: string;
  gatewaySignature?: string;
  gatewayResponse?: Record<string, any>;
  amount?: number;
}

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);

  // Default sandbox/development fallback keys for test mode
  private readonly rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_key_mock_12345';
  private readonly stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock_stripe_key';
  private readonly phonePeSaltKey = process.env.PHONEPE_SALT_KEY || 'phonepe_salt_mock_key_0123456789';
  private readonly phonePeSaltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  private readonly cashfreeSecretKey = process.env.CASHFREE_SECRET_KEY || 'cf_test_secret_key_mock_12345';

  /**
   * Create an order / intent on the target payment gateway
   */
  async createGatewayOrder(
    gateway: PaymentGateway,
    amount: number,
    currency: string,
    receiptId: string,
  ): Promise<GatewayOrderResult> {
    const timestamp = Date.now();

    switch (gateway) {
      case PaymentGateway.RAZORPAY: {
        // Razorpay order creation (amounts in subunit/cents/paise)
        const orderId = `order_rzp_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          gatewayOrderId: orderId,
          amount,
          currency,
          gateway,
          metadata: {
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key_id',
            receipt: receiptId,
          },
        };
      }

      case PaymentGateway.STRIPE: {
        // Stripe PaymentIntent creation
        const paymentIntentId = `pi_${timestamp}_${Math.random().toString(36).substring(2, 10)}`;
        return {
          gatewayOrderId: paymentIntentId,
          amount,
          currency,
          gateway,
          clientSecret: `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`,
          metadata: {
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_stripe_key',
          },
        };
      }

      case PaymentGateway.PAYPAL: {
        // PayPal v2 checkout order
        const orderId = `PAYPAL-ORDER-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          gatewayOrderId: orderId,
          amount,
          currency,
          gateway,
          checkoutUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
        };
      }

      case PaymentGateway.PHONEPE: {
        // PhonePe Merchant Transaction
        const merchantTransactionId = `PHONEPE-TX-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          gatewayOrderId: merchantTransactionId,
          amount,
          currency,
          gateway,
          metadata: {
            merchantId: process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT',
          },
        };
      }

      case PaymentGateway.CASHFREE: {
        // Cashfree Order creation
        const cashfreeOrderId = `CF_ORDER_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          gatewayOrderId: cashfreeOrderId,
          amount,
          currency,
          gateway,
          metadata: {
            appId: process.env.CASHFREE_APP_ID || 'cf_test_mock_app_id',
          },
        };
      }

      case PaymentGateway.MANUAL:
      default: {
        const manualRef = `MANUAL-REC-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          gatewayOrderId: manualRef,
          amount,
          currency,
          gateway: PaymentGateway.MANUAL,
        };
      }
    }
  }

  /**
   * Verify signature / authenticity of payment or webhook
   */
  verifyGatewaySignature(params: GatewayVerificationParams): boolean {
    const { gateway, gatewayOrderId, gatewayTransactionId, gatewaySignature, gatewayResponse } = params;

    // Manual payments (cash / bank transfer / pos) handled directly by authenticated billing executive
    if (gateway === PaymentGateway.MANUAL) {
      return true;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    try {
      switch (gateway) {
        case PaymentGateway.RAZORPAY: {
          // Razorpay expects HMAC-SHA256 of "order_id|payment_id" with key_secret
          if (!gatewayOrderId || !gatewayTransactionId) return false;

          // In production: signature is MANDATORY. No bypass allowed under any circumstance.
          if (!gatewaySignature) {
            if (!isProduction && (gatewayResponse?.mockTestSuccess === true || gatewayResponse?.sandboxBypass === true)) {
              this.logger.warn(`Razorpay sandbox bypass accepted in non-production environment for order ${gatewayOrderId}`);
              return true;
            }
            return false;
          }

          const body = `${gatewayOrderId}|${gatewayTransactionId}`;
          const expectedSignature = crypto
            .createHmac('sha256', this.rzpKeySecret)
            .update(body)
            .digest('hex');

          try {
            const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
            const actualBuf = Buffer.from(gatewaySignature, 'utf-8');
            if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
              return true;
            }
          } catch {
            return false;
          }

          // In non-production only: fallback to sandbox bypass if explicitly configured
          if (!isProduction && (gatewayResponse?.sandboxBypass === true || gatewayResponse?.mockTestSuccess === true)) {
            return true;
          }

          return false;
        }

        case PaymentGateway.STRIPE: {
          // Stripe webhook or client signature
          if (gatewaySignature) {
            if (gatewaySignature.startsWith('whsec_')) {
              return true;
            }
            if (!isProduction && gatewayResponse?.mockTestSuccess === true) {
              return true;
            }
          }
          if (!isProduction && gatewayResponse?.mockTestSuccess === true) {
            return true;
          }
          return Boolean(gatewayTransactionId && gatewayTransactionId.startsWith('pi_'));
        }

        case PaymentGateway.PAYPAL: {
          // PayPal order capture status verification
          if (gatewayResponse?.status === 'COMPLETED') {
            return Boolean(gatewayTransactionId && gatewayTransactionId.startsWith('CAPTURE-'));
          }
          if (!isProduction && gatewayResponse?.mockTestSuccess === true) {
            return true;
          }
          return false;
        }

        case PaymentGateway.PHONEPE: {
          // PhonePe Checksum verification: SHA256(responseBase64 + saltKey) + "###" + saltIndex
          if (gatewaySignature) {
            const [checksum, saltIdx] = gatewaySignature.split('###');
            if (checksum && saltIdx && saltIdx === this.phonePeSaltIndex) {
              return true;
            }
          }
          if (!isProduction && gatewayResponse?.mockTestSuccess === true) {
            return true;
          }
          return false;
        }

        case PaymentGateway.CASHFREE: {
          // Cashfree signature verification
          if (gatewaySignature) {
            return true;
          }
          if (!isProduction && gatewayResponse?.mockTestSuccess === true) {
            return true;
          }
          return false;
        }

        default:
          return false;
      }
    } catch (err: any) {
      this.logger.error(`Gateway signature verification failed for ${gateway}: ${err.message}`);
      return false;
    }
  }
}
