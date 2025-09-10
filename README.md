# Project Setup
    
    To run this project, follow these steps:
    
    1. Extract the zip file.
    2. Run `npm install` to install dependencies.
    3. Run `npm run dev` to start the development server.
    
    This project was generated through Alpha. For more information, visit [dualite.dev](https://dualite.dev).
    
    ## Environment & running tests
    
    This project uses a local `.env` file (gitignored) to store API keys and secrets. Do NOT commit your real keys. A safe example is provided in `.env.example`.
    
    1. Copy the example and fill values locally:
    ```powershell
    Copy-Item .env.example .env
    notepad .env
    ```
    
    2. Install dependencies (if not already):
    ```powershell
    npm install
    ```
    
    3. Run the connectivity test script (it will use your `.env`):
    ```powershell
    node "New folder/test.cjs"
    ```
    
    If a test prints `SKIPPED` for a service, add the corresponding key to your `.env` and rerun. If a test returns HTTP 4xx/5xx, check the provider docs and key permissions.
    
    ## Paystack testing & webhook
    
    To initialize and verify a test transaction locally, use the included script:
    ```powershell
    node "New folder/paystack_test.cjs"
    ```
    The script will print a reference and verification status. To complete a payment flow, open the returned authorization URL in a browser and complete a test card flow.
    
    To accept Paystack webhooks in development, run the example listener and configure the webhook URL in your Paystack dashboard:
    ```powershell
    npm install express
    node "New folder/paystack_webhook.js"
    ```
    
    The webhook verifies `x-paystack-signature` using your `PAYSTACK_SECRET` before processing events. Implement your business logic in `New folder/paystack_webhook.js`.