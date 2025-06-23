// generateSecret.js
const { generateEntitySecret } = require('@circle-fin/developer-controlled-wallets');

// This function generates a new random secret.
// Run this file once and save the output securely.
const secret = generateEntitySecret();
console.log("Your new Entity Secret is:");
console.log(secret);
console.log("\nStore this securely and use it in your .env file.");