export const staffInvitationTemplate = (name, role, otp, inviterName) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0e14; padding: 40px 20px; text-align: center; color: #f3f4f6;">
    <div style="max-width: 520px; margin: 0 auto; background-color: #121722; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      
      <!-- Premium Operations Header -->
      <div style="background: linear-gradient(135deg, #9333ea, #e11d48, #d97706); padding: 32px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 2px; font-family: 'Outfit', sans-serif;">
          VYBE OPERATIONS SUITE
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">
          Staff Invitation & Security Authorization
        </p>
      </div>

      <!-- Content Section -->
      <div style="padding: 36px 30px; text-align: left;">
        <p style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 0;">Hello ${name},</p>
        
        <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 20px;">
          You have been invited by <strong>${inviterName || "Super Administrator"}</strong> to join the official <strong>VYBE Operations Suite</strong> as an authorized <span style="color: #c084fc; font-weight: 700; text-transform: uppercase;">${role}</span>.
        </p>

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px;">
          To complete your onboarding verification and activate your administrative credentials, please provide the 6-digit verification code below to your administrator or enter it on the confirmation screen:
        </p>

        <!-- OTP Display Box -->
        <div style="text-align: center; margin: 28px 0;">
          <div style="
            display: inline-block;
            font-size: 32px;
            font-weight: 900;
            letter-spacing: 10px;
            padding: 16px 32px;
            color: #ffffff;
            background: linear-gradient(135deg, #7c3aed, #db2777);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(219, 39, 119, 0.3);
            text-indent: 10px;
            font-family: monospace;
          ">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Security authorization code is valid for 15 minutes</p>
        </div>

        <div style="background-color: rgba(244, 63, 94, 0.08); border-left: 3px solid #f43f5e; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #fda4af; margin: 0; line-height: 1.5;">
            <strong>Security Notice:</strong> Administrative access is logged and audited. Do not share this code or your login credentials with unauthorized individuals.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 28px 0;" />

        <!-- Signature -->
        <p style="font-size: 13px; color: #9ca3af; margin: 0; line-height: 1.5;">
          Official Trust & Security Division<br/>
          <strong>VYBE Operations Suite 🇮🇳</strong>
        </p>
      </div>

      <!-- Footer Section -->
      <div style="background-color: #0b0e14; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 18px 30px; text-align: center;">
        <p style="font-size: 11px; color: #4b5563; margin: 0;">
          Confidential • For Authorized Personnel Only
        </p>
      </div>

    </div>
  </div>
`;

export default staffInvitationTemplate;
