import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ProtocolLM <noreply@protocollm.org>';
const SUPPORT_EMAIL = process.env.RESEND_SUPPORT_EMAIL || 'support@protocollm.org';

export const emailService = {
  // Welcome email after signup
  async sendWelcomeEmail(userEmail: string, userName?: string): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: 'Welcome to ProtocolLM! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
                .content { background: #f9fafb; padding: 40px 30px; }
                .button { display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; }
                .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #059669; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 32px;">Welcome to ProtocolLM!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Enterprise-grade document storage with semantic search</p>
                </div>
                
                <div class="content">
                  <p>Hi ${userName || 'there'}! 👋</p>
                  
                  <p>Thanks for joining ProtocolLM! Your account is now active and ready to use.</p>
                  
                  <div style="text-align: center;">
                    <a href="https://protocollm.org/login" class="button">Get Started →</a>
                  </div>
                  
                  <h3 style="color: #059669; margin-top: 30px;">What you can do with ProtocolLM:</h3>
                  
                  <div class="feature">
                    <strong>📤 Upload Documents</strong>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Store unlimited documents with automatic AI processing and OCR</p>
                  </div>
                  
                  <div class="feature">
                    <strong>🔍 Semantic Search</strong>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Find documents using natural language - no exact keywords needed</p>
                  </div>
                  
                  <div class="feature">
                    <strong>💬 Chat with Documents</strong>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Ask questions and get instant answers from all your files</p>
                  </div>
                  
                  <div class="feature">
                    <strong>📊 Generate Reports</strong>
                    <p style="margin: 5px 0 0 0; color: #6b7280;">Create comprehensive reports from multiple documents automatically</p>
                  </div>
                  
                  <p style="margin-top: 30px;">Need help? Reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #059669;">${SUPPORT_EMAIL}</a></p>
                </div>
                
                <div class="footer">
                  <p style="margin: 0 0 10px 0;"><strong>ProtocolLM</strong></p>
                  <p style="margin: 0;">Enterprise document storage with AI-powered search</p>
                  <p style="margin: 15px 0 0 0; font-size: 12px;">
                    <a href="https://protocollm.org/privacy" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a> • 
                    <a href="https://protocollm.org/terms" style="color: #9ca3af; text-decoration: none;">Terms of Service</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      
      console.log(`✓ Welcome email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw - email failures shouldn't break signup
    }
  },

  // Password reset email
  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://protocollm.org'}/reset-password?token=${resetToken}`;
    
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: 'Reset Your ProtocolLM Password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1f2937; color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
                .content { background: #f9fafb; padding: 40px 30px; }
                .button { display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">Password Reset Request</h1>
                </div>
                
                <div class="content">
                  <p>Hi there,</p>
                  
                  <p>We received a request to reset your ProtocolLM password. Click the button below to create a new password:</p>
                  
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password →</a>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link into your browser:</p>
                  <p style="font-size: 12px; color: #6b7280; word-break: break-all; background: white; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                  
                  <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">This link will expire in 1 hour. If you didn't request this reset, please ignore this email or contact support.</p>
                  </div>
                  
                  <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #059669;">${SUPPORT_EMAIL}</a></p>
                </div>
                
                <div class="footer">
                  <p style="margin: 0;"><strong>ProtocolLM</strong> • Enterprise Document Storage</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      
      console.log(`✓ Password reset email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error; // This one should throw - password reset is critical
    }
  },

  // Storage limit warning
  async sendStorageLimitWarning(userEmail: string, percentUsed: number, plan: string): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: `⚠️ Storage Warning: ${percentUsed}% Used`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f59e0b; color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
                .content { background: #f9fafb; padding: 40px 30px; }
                .button { display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .progress-bar { background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }
                .progress-fill { background: ${percentUsed >= 90 ? '#ef4444' : '#f59e0b'}; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
                .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">⚠️ Storage Limit Warning</h1>
                </div>
                
                <div class="content">
                  <p>Hi there,</p>
                  
                  <p>Your ProtocolLM storage is getting full. You've used <strong>${percentUsed}%</strong> of your ${plan} plan storage:</p>
                  
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentUsed}%;">${percentUsed}%</div>
                  </div>
                  
                  <p>To avoid service interruption, please:</p>
                  <ul>
                    <li>Delete unused files to free up space</li>
                    <li>Upgrade to a higher-tier plan for more storage</li>
                  </ul>
                  
                  <div style="text-align: center;">
                    <a href="https://protocollm.org/home" class="button">Manage Storage →</a>
                  </div>
                </div>
                
                <div class="footer">
                  <p style="margin: 0;"><strong>ProtocolLM</strong> • Enterprise Document Storage</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
      
      console.log(`✓ Storage warning email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending storage warning email:', error);
    }
  },

  // Support/Contact form submission
  async sendSupportEmail(userEmail: string, subject: string, message: string): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: SUPPORT_EMAIL,
        replyTo: userEmail,
        subject: `Support Request: ${subject}`,
        html: `
          <h2>New Support Request</h2>
          <p><strong>From:</strong> ${userEmail}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      });
      
      // Send confirmation to user
      await resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: 'We received your message',
        html: `
          <p>Hi there,</p>
          <p>We've received your support request and will get back to you within 24 hours.</p>
          <p><strong>Your message:</strong></p>
          <blockquote style="border-left: 4px solid #059669; padding-left: 15px; color: #6b7280;">
            ${message.replace(/\n/g, '<br>')}
          </blockquote>
          <p>Thanks,<br>The ProtocolLM Team</p>
        `,
      });
      
      console.log(`✓ Support email sent from ${userEmail}`);
    } catch (error) {
      console.error('Error sending support email:', error);
      throw error;
    }
  },
};
