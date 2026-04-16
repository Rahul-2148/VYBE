export const passwordResetSuccessTemplate = (name) => `
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
        This is a confirmation that your VYBE account password has been <b>successfully reset</b>.
      </p>

      <div style="margin: 20px 0; text-align:center;">
        <span style="
          display:inline-block;
          padding:12px 26px;
          background:#6a11cb;
          color:#fff;
          font-weight:600;
          border-radius:8px;
          font-size:15px;
        ">
          Password Reset Successful
        </span>
      </div>

      <p style="font-size:14px; color:#555; line-height:1.4;">
        If you did not perform this action, please contact our support immediately to secure your account.
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
