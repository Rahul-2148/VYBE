export const forgotPasswordTemplate = (name, otp, resetLink) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; padding: 40px 20px; text-align: center;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e6e6e6; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      
      <!-- Premium Brand Header -->
      <div style="background: linear-gradient(135deg, #c13584, #833ab4, #fd1d1d); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 2px; font-family: 'Outfit', 'Inter', sans-serif;">
          VYBE
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px; font-weight: 500; letter-spacing: 1px;">
          Not Just A Platform, It's A VYBE
        </p>
      </div>

      <!-- Content Section -->
      <div style="padding: 40px 30px; text-align: left;">
        <p style="font-size: 16px; font-weight: 600; color: #262626; margin-top: 0;">Hi ${name},</p>
        
        <p style="font-size: 14px; color: #737373; line-height: 1.6; margin-bottom: 25px;">
          You requested to reset your VYBE password. You can complete the reset using <strong>either</strong> the OTP code below or the secure Reset Link button:
        </p>

        <!-- OTP Section -->
        <div style="text-align: center; margin: 25px 0;">
          <p style="font-size: 12px; font-weight: 700; color: #737373; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Option 1: Enter Verification Code</p>
          <div style="
            display: inline-block;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 8px;
            padding: 15px 30px;
            color: #ffffff;
            background: linear-gradient(135deg, #c13584, #833ab4);
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(131, 58, 180, 0.2);
            text-indent: 8px;
          ">
            ${otp}
          </div>
          <p style="font-size: 11px; color: #a8a8a8; margin-top: 8px;">Valid for 15 minutes</p>
        </div>

        <div style="text-align: center; margin: 25px 0; display: flex; align-items: center; justify-content: center;">
          <div style="flex: 1; border-top: 1px solid #efefef;"></div>
          <span style="font-size: 11px; font-weight: 700; color: #a8a8a8; padding: 0 15px; text-transform: uppercase;">OR</span>
          <div style="flex: 1; border-top: 1px solid #efefef;"></div>
        </div>

        <!-- Reset Link Section -->
        <div style="text-align: center; margin: 25px 0;">
          <p style="font-size: 12px; font-weight: 700; color: #737373; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Option 2: One-Click Reset Link</p>
          <a href="${resetLink}" target="_blank" style="
            display: inline-block;
            padding: 14px 30px;
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
            text-decoration: none;
            background: linear-gradient(135deg, #c13584, #833ab4);
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(131, 58, 180, 0.25);
            text-align: center;
          ">
            Reset Password
          </a>
          <p style="font-size: 11px; color: #a8a8a8; margin-top: 8px;">Valid for 15 minutes</p>
        </div>

        <hr style="border: none; border-top: 1px solid #efefef; margin: 30px 0;" />

        <p style="font-size: 14px; color: #737373; line-height: 1.6;">
          If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged and your account is secure.
        </p>

        <hr style="border: none; border-top: 1px solid #efefef; margin: 30px 0;" />

        <!-- Signature -->
        <p style="font-size: 14px; color: #737373; margin: 0; line-height: 1.4;">
          Cheers,<br/>
          <strong>Team VYBE 🇮🇳</strong>
        </p>
      </div>

      <!-- Footer Section -->
      <div style="background-color: #fafafa; border-top: 1px solid #efefef; padding: 20px 30px; text-align: center;">
        <p style="font-size: 11px; color: #a8a8a8; margin: 0;">
          Made with ❤️ in India
        </p>
      </div>

    </div>
  </div>
`;
