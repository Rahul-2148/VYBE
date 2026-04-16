export const forgotPasswordTemplate = (name, otp, resetLink) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f2f1ff; padding: 30px;">
    <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 14px; padding: 30px; border: 1px solid #e5e5e5;">
      
      <!-- Brand Header -->
      <h2 style="text-align:center; font-size: 28px; font-weight: 700; color:#6a11cb; margin-bottom: 6px;">
        VYBE
      </h2>
      <p style="text-align:center; color:#4a4a4a; margin-top:0; font-size:14px;">
        Not Just A Platform, It's A VYBE
      </p>

      <hr style="border:none; border-top: 1px solid #eee; margin: 20px 0;" />

      <!-- Greeting -->
      <p style="font-size:16px; font-weight:500; color:#222;">Hi ${name},</p>

      <p style="font-size:15px; color:#444; line-height:1.5;">
        You requested to reset your VYBE password.
        You can reset your password using <b>either</b> OTP or Reset Link:
      </p>

      <!-- OTP Section -->
      <div style="text-align:center; margin: 28px 0;">
        <div style="
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 6px;
          padding: 14px 26px;
          color:#ffffff;
          background: #6a11cb;
          border-radius: 10px;
          display:inline-block;
        ">
          ${otp}
        </div>
        <p style="font-size:13px; color:#777;">OTP valid for 10 minutes</p>
      </div>

      <!-- Reset Link Button -->
      <div style="text-align:center; margin: 20px 0;">
        <a href="${resetLink}" target="_blank" style="
          padding: 12px 26px;
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
          background: #6a11cb;
          border-radius: 8px;
          text-decoration: none;
          display:inline-block;
        ">
          Reset Password via Link
        </a>
        <p style="font-size:13px; color:#777; margin-top:10px;">
          Link valid for 15 minutes
        </p>
      </div>

      <p style="font-size:14px; color:#555; line-height:1.4;">
        If you did not request this action, you can safely ignore this email.<br/>
        Your account is secure. ✨
      </p>

      <br/>

      <!-- Footer -->
      <p style="font-size:14px; color:#7b7b7b; margin-top:30px;">
        Cheers,<br/><b>Team VYBE 🇮🇳</b>
      </p>

      <hr style="border:none; border-top: 1px solid #eee; margin: 25px 0;" />

      <p style="font-size:12px; color:#999; text-align:center;">
        Proudly Made in India ❤️
      </p>
    </div>
  </div>
`;
