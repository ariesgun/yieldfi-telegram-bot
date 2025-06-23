import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import fs from 'fs';

const response = await registerEntitySecretCiphertext(
    {
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET
    }
);

fs.writeFileSync(
    'recovery_file.dat',
    response.data?.recoveryFile ?? '',
)