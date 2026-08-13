export const passwordResetSuccessTemplate = (name) => `
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
          Your VYBE account password has been <strong>successfully reset</strong>. You can now log back into your account using your new credentials.
        </p>

        <!-- Success Badge -->
        <div style="text-align: center; margin: 30px 0;">
          <div style="
            display: inline-block;
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
            background: #12d06c;
            padding: 12px 24px;
            border-radius: 30px;
            box-shadow: 0 4px 10px rgba(18, 208, 108, 0.2);
          ">
            ✓ Password Updated Successfully
          </div>
        </div>

        <p style="font-size: 14px; color: #737373; line-height: 1.6;">
          If you did not perform this request, please contact our support team immediately or secure your account under settings.
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
