import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../middleware/errorHandler.js";
import { sendOtp } from "./otpSender.js";

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Normalise un numéro de téléphone pour la comparaison.
 * On retire espaces, tirets, points, parenthèses. On garde un éventuel +.
 * (Allemagne : les numéros peuvent être saisis avec +49, 0049 ou le 0 national.)
 */
export function normalizePhone(raw: string): string {
  let p = raw.trim().replace(/[\s\-.()]/g, "");
  // Normalise l'indicatif allemand : +49 170…, 0049 170…, 49170… ou 0170…
  if (p.startsWith("+49")) p = p.slice(3);
  else if (p.startsWith("0049")) p = p.slice(4);
  else if (p.startsWith("49") && p.length > 10) p = p.slice(2);
  if (p.startsWith("0")) p = p.slice(1); // préfixe national (0170… → 170…)
  return p; // on compare sur le numéro national sans 0
}

/** Génère un code à 6 chiffres */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* =====================================================
   DEMANDE D'OTP
   ===================================================== */
export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);

  if (phone.length < 6) {
    throw badRequest("Numéro de téléphone invalide.");
  }

  // Anti-spam : cooldown entre 2 envois pour le même numéro
  const recent = await prisma.otpCode.findFirst({
    where: { phone, purpose: "TRACK", consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent) {
    const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      throw badRequest(
        `Veuillez patienter ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)} secondes avant de redemander un code.`
      );
    }
  }

  // Vérifie qu'au moins un colis existe pour ce numéro — sinon inutile d'envoyer.
  // NOTE anti-énumération : on renvoie TOUJOURS un succès générique côté route,
  // même si aucun colis (voir la route). Ici on génère quand même l'OTP pour
  // ne pas révéler l'existence par le timing.
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  // Invalide les anciens OTP non consommés de ce numéro
  await prisma.otpCode.updateMany({
    where: { phone, purpose: "TRACK", consumedAt: null },
    data: { consumedAt: new Date() }, // marque comme consommé/annulé
  });

  await prisma.otpCode.create({
    data: { phone, codeHash, purpose: "TRACK", expiresAt },
  });

  // Envoi (simulation par défaut → le code apparaît dans les logs serveur)
  const result = await sendOtp(rawPhone, code);

  return { sent: true, simulated: result.simulated };
}

/* =====================================================
   VÉRIFICATION D'OTP → renvoie les colis du numéro
   ===================================================== */
export async function verifyOtpAndGetShipments(rawPhone: string, code: string) {
  const phone = normalizePhone(rawPhone);

  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose: "TRACK", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw badRequest("Aucun code actif. Demandez un nouveau code.");
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    throw badRequest("Code expiré. Demandez un nouveau code.");
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    // Consomme pour forcer une nouvelle demande
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
    throw badRequest("Trop de tentatives. Demandez un nouveau code.");
  }

  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = MAX_ATTEMPTS - (otp.attempts + 1);
    throw badRequest(
      remaining > 0
        ? `Code incorrect. ${remaining} tentative(s) restante(s).`
        : "Code incorrect. Demandez un nouveau code."
    );
  }

  // Succès → consomme l'OTP
  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  // Récupère les colis où ce numéro est le destinataire.
  // On compare sur le numéro normalisé : on charge les colis dont le
  // receiverPhone normalisé correspond. Prisma ne normalise pas côté SQL,
  // donc on filtre en mémoire sur un sur-ensemble raisonnable.
  const candidates = await prisma.shipment.findMany({
    where: { deletedAt: null },
    select: {
      trackingNumber: true,
      status: true,
      deliveryCity: true,
      deliveryType: true,
      isFragile: true,
      createdAt: true,
      deliveredAt: true,
      receiverPhone: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const mine = candidates
    .filter((s) => s.receiverPhone && normalizePhone(s.receiverPhone) === phone)
    .map((s) => ({
      trackingNumber: s.trackingNumber,
      status: s.status,                 // front traduit via common.status.*
      destinationCity: s.deliveryCity,  // gouvernorat (non traduit)
      deliveryType: s.deliveryType,
      isFragile: s.isFragile,
      createdAt: s.createdAt.toISOString(),
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
    }));

  return { shipments: mine, count: mine.length };
}
