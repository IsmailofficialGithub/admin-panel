# PayPal Integration Setup Guide

## Environment Variables

### Backend `.env` file:

Add these to your `backend/.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_MODE=sandbox  # Use 'sandbox' for testing, 'live' for production
CLIENT_URL=http://localhost:3000  # Your frontend URL
```

### Frontend `.env` file:

Add this to your `front-end/.env` file:

```env
# PayPal Client ID (for PayPal Buttons SDK)
REACT_APP_PAYPAL_CLIENT_ID=your_paypal_client_id_here
```

**Note:** Use the same Client ID for both backend and frontend. The frontend needs it to load PayPal Buttons SDK.

## Getting PayPal Sandbox Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal account
3. Navigate to **Dashboard** → **My Apps & Credentials**
4. Under **Sandbox** tab, create a new app or use existing one
5. Copy the **Client ID** and **Secret** to your `.env` file

## Testing with Sandbox

1. Use PayPal sandbox test accounts from [PayPal Sandbox](https://developer.paypal.com/dashboard/accounts)
2. Test with different account types (Personal, Business)
3. Use test credit cards provided by PayPal for testing

## API Endpoints

- `POST /api/paypal/create-order` - Creates a PayPal order
- `POST /api/paypal/capture-payment` - Captures the payment after user approval

## Payment Flow

1. User selects PayPal payment method
2. PayPal SDK loads dynamically (using `REACT_APP_PAYPAL_CLIENT_ID`)
3. PayPal Buttons component renders (PayPal's default template)
4. User clicks PayPal button
5. Frontend calls `/api/paypal/create-order` with encrypted payment data
6. Backend creates PayPal order and returns order ID
7. PayPal handles the payment flow (user approves in PayPal popup/modal)
8. Frontend automatically calls `/api/paypal/capture-payment` to complete the payment
9. Invoice is marked as paid and payment record is created

**Note:** This uses PayPal Buttons (client-side integration) instead of redirect flow, providing a seamless user experience similar to Stripe Elements.

