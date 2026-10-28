/**
 * Genera el valor de ADMIN_PASSWORD_HASH.
 * Uso: npm run admin:hash -- "una contraseña larga y segura"
 */
import { hashPassword } from "../src/lib/server/security";

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error("Indicá una contraseña de al menos 12 caracteres: npm run admin:hash -- \"mi contraseña\"");
  process.exit(1);
}
hashPassword(pw).then((h) => {
  console.log("\nCopiá esta línea en las variables de entorno:\n");
  console.log(`ADMIN_PASSWORD_HASH=${h}\n`);
});
