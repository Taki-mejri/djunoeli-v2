/**
 * Envoi de messages OTP — couche d'abstraction.
 *
 * MODE SIMULATION (par défaut) : le code est affiché dans les logs du serveur,
 * rien n'est réellement envoyé. Gratuit, parfait pour développer/tester.
 *
 * MODE RÉEL : quand tu auras choisi un fournisseur (Twilio, etc.), tu
 * remplaces le corps de sendViaProvider() par l'appel API. Le reste du code
 * (génération, vérification) ne change pas.
 *
 * Le canal (WhatsApp/SMS) est lu depuis l'env pour être prêt sans refactor.
 */

type Channel = "SIMULATION" | "SMS" | "WHATSAPP";

function currentChannel(): Channel {
  const c = (process.env.OTP_CHANNEL ?? "SIMULATION").toUpperCase();
  if (c === "SMS" || c === "WHATSAPP") return c;
  return "SIMULATION";
}

/**
 * Envoie le code OTP au numéro donné.
 * Retourne { simulated: true, code } en mode simulation pour faciliter les
 * tests (le front NE doit PAS afficher ce code en prod — voir la route).
 */
export async function sendOtp(phone: string, code: string): Promise<{ simulated: boolean }> {
  const channel = currentChannel();

  if (channel === "SIMULATION") {
    // Mode simulation : on log, on n'envoie rien.
    console.log("");
    console.log("┌─────────────────────────────────────────────┐");
    console.log("│  OTP SIMULATION (aucun SMS réellement envoyé) │");
    console.log(`│  Téléphone : ${phone.padEnd(31)}│`);
    console.log(`│  Code      : ${code.padEnd(31)}│`);
    console.log("│  Expire dans 5 minutes                        │");
    console.log("└─────────────────────────────────────────────┘");
    console.log("");
    return { simulated: true };
  }

  // MODE RÉEL — à implémenter quand un fournisseur est choisi.
  await sendViaProvider(channel, phone, code);
  return { simulated: false };
}

/**
 * Point de branchement du vrai fournisseur.
 * EXEMPLE (Twilio) — décommente et adapte quand tu auras tes clés :
 *
 * import twilio from "twilio";
 * const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
 *
 * if (channel === "SMS") {
 *   await client.messages.create({
 *     to: phone,
 *     from: process.env.TWILIO_FROM,               // ton numéro Twilio
 *     body: `Djunoeli : votre code de suivi est ${code}. Valide 5 min.`,
 *   });
 * } else if (channel === "WHATSAPP") {
 *   await client.messages.create({
 *     to: `whatsapp:${phone}`,
 *     from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
 *     body: `Djunoeli : votre code de suivi est ${code}. Valide 5 min.`,
 *   });
 * }
 */
async function sendViaProvider(channel: Channel, phone: string, code: string): Promise<void> {
  // Tant que le fournisseur n'est pas branché, on évite un échec silencieux :
  // on log et on lève une erreur claire pour ne pas laisser croire à un envoi.
  console.warn(
    `[OTP] Canal ${channel} demandé mais aucun fournisseur n'est branché. ` +
      `Reste en SIMULATION ou implémente sendViaProvider(). Code non envoyé.`
  );
  // On ne divulgue pas le code ici. On lève une erreur pour signaler la config manquante.
  throw new Error("Fournisseur SMS/WhatsApp non configuré");
}
