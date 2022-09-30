const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0
};
const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
        "gateway": "stripe",
        "stripe:version": "2018-10-31",
        "stripe:publishableKey": "YOUR_PUBLIC_STRIPE_KEY"
    }
};