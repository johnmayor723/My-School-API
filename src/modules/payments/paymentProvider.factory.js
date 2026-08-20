const env = require("../../config/env");
const { PAYMENT_PROVIDERS } = require("../../config/constants");
const mockProvider = require("./providers/mock.provider");
const paystackProvider = require("./providers/paystack.provider");
const flutterwaveProvider = require("./providers/flutterwave.provider");
const { AppError } = require("../../errors/AppError");

const providers = {
  [PAYMENT_PROVIDERS.MOCK]: mockProvider,
  [PAYMENT_PROVIDERS.PAYSTACK]: paystackProvider,
  [PAYMENT_PROVIDERS.FLUTTERWAVE]: flutterwaveProvider,
};

function getProvider(name = env.paymentProvider) {
  const provider = providers[name];
  if (!provider) throw new AppError(`Unknown payment provider: ${name}`, 500, "PAYMENT_PROVIDER_NOT_CONFIGURED");
  return provider;
}

module.exports = { getProvider, providers };
