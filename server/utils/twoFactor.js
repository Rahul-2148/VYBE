import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const generateTwoFactorSecret = (email) => {
  const secret = generateSecret();
  const serviceName = "VYBE Social";
  const otpauthUrl = generateURI({ label: email || "user@vybe.app", issuer: serviceName, secret });
  return { secret, otpauthUrl };
};

export const generateQrCodeDataUrl = async (otpauthUrl) => {
  return await QRCode.toDataURL(otpauthUrl);
};

export const verifyTwoFactorToken = (token, secret) => {
  try {
    const cleanToken = String(token).trim().replace(/\s+/g, "");
    if (!cleanToken || !secret) return false;
    const result = verifySync({ token: cleanToken, secret });
    return result && result.valid === true;
  } catch (error) {
    console.error("verifyTwoFactorToken error:", error);
    return false;
  }
};

export const generateRecoveryCodes = async () => {
  const rawCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < 8; i++) {
    const randomBytes = crypto.randomBytes(4).toString("hex").toUpperCase();
    const code = `VYBE-${randomBytes.slice(0, 4)}-${randomBytes.slice(4, 8)}`;
    rawCodes.push(code);

    const hashed = await bcrypt.hash(code, 10);
    hashedCodes.push(hashed);
  }

  return { rawCodes, hashedCodes };
};

export const verifyAndConsumeRecoveryCode = async (inputCode, hashedCodesArray = []) => {
  const cleanCode = String(inputCode).trim().toUpperCase();

  for (let i = 0; i < hashedCodesArray.length; i++) {
    const match = await bcrypt.compare(cleanCode, hashedCodesArray[i]);
    if (match) {
      // Remove used recovery code (single-use pattern)
      const updatedCodes = [...hashedCodesArray];
      updatedCodes.splice(i, 1);
      return { valid: true, updatedCodes };
    }
  }

  return { valid: false, updatedCodes: hashedCodesArray };
};
