import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getEmailSettings } from '../config/storefront.js';

dotenv.config();

// Create email transporter
const createTransporter = () => {
  const emailSettings = getEmailSettings();
  const smtpPort = Number(emailSettings.smtpPort || process.env.SMTP_PORT || 587);
  const smtpUser = emailSettings.smtpUser || process.env.SMTP_USER || '';
  const smtpPass = emailSettings.smtpPass || process.env.SMTP_PASS || '';

  return nodemailer.createTransporter({
    host: emailSettings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: emailSettings.secure || smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

// Email templates
const emailTemplates = {
  orderConfirmation: (order) => ({
    subject: `Order Confirmation - ${order.reference}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafaf8;">
        <div style="background: #0a0a0a; padding: 40px 20px; text-align: center;">
          <h1 style="color: #c8a830; font-size: 28px; margin: 0; font-weight: 300;">SINIPO ART STUDIO</h1>
          <p style="color: #ffffff; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">STRONGER TOGETHER</p>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #0a0a0a; font-size: 24px; font-weight: 300; margin-bottom: 20px;">Order Confirmed!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your purchase. Your order has been confirmed and is being processed.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0a0a0a; font-size: 16px; margin-bottom: 10px;">Order Details</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Reference:</strong> ${order.reference}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Amount:</strong> $${order.amount.toLocaleString()}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0a0a0a; font-size: 16px; margin-bottom: 10px;">Items Ordered</h3>
            ${order.items.map(item => `
              <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <p style="margin: 0; color: #0a0a0a; font-weight: 500;">${item.artwork.title}</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">by ${item.artwork.artist}</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">Qty: ${item.quantity} × $${item.artwork.price}</p>
              </div>
            `).join('')}
          </div>
          
          <div style="background: #c8a830; color: white; padding: 15px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">Your artwork will be carefully packaged and shipped within 3-5 business days.</p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-top: 20px;">
            You will receive a shipping confirmation email with tracking information once your order has been dispatched.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: #0a0a0a; color: white; padding: 12px 30px; text-decoration: none; font-size: 12px; letter-spacing: 2px;">
              VISIT STORE
            </a>
          </div>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Sinipo Art Studio. All rights reserved.
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
            Questions? Contact us at hello@sinipo.art
          </p>
        </div>
      </div>
    `
  }),

  shippingUpdate: (order, trackingNumber) => ({
    subject: `Your Order Has Shipped - ${order.reference}`,
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafaf8;">
        <div style="background: #0a0a0a; padding: 40px 20px; text-align: center;">
          <h1 style="color: #c8a830; font-size: 28px; margin: 0; font-weight: 300;">SINIPO ART STUDIO</h1>
          <p style="color: #ffffff; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">STRONGER TOGETHER</p>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #0a0a0a; font-size: 24px; font-weight: 300; margin-bottom: 20px;">Your Order Has Shipped!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Great news! Your order is on its way to you.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0a0a0a; font-size: 16px; margin-bottom: 10px;">Shipping Details</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Order Reference:</strong> ${order.reference}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Estimated Delivery:</strong> 5-7 business days</p>
          </div>
          
          <div style="background: #c8a830; color: white; padding: 15px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">Track your package using the tracking number above.</p>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0a0a0a; font-size: 16px; margin-bottom: 10px;">Delivery Address</h3>
            <p style="margin: 0; color: #666;">
              ${order.customerInfo.firstName} ${order.customerInfo.lastName}<br>
              ${order.customerInfo.address}<br>
              ${order.customerInfo.city}, ${order.customerInfo.country}
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6; margin-top: 20px;">
            Your artwork has been carefully packaged to ensure safe delivery. A certificate of authenticity is included with your order.
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Sinipo Art Studio. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),

  welcomeEmail: (user) => ({
    subject: 'Welcome to Sinipo Art Studio',
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafaf8;">
        <div style="background: #0a0a0a; padding: 40px 20px; text-align: center;">
          <h1 style="color: #c8a830; font-size: 28px; margin: 0; font-weight: 300;">SINIPO ART STUDIO</h1>
          <p style="color: #ffffff; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">STRONGER TOGETHER</p>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #0a0a0a; font-size: 24px; font-weight: 300; margin-bottom: 20px;">Welcome, ${user.firstName}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining Sinipo Art Studio. We're excited to have you as part of our community of art and fashion lovers.
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0a0a0a; font-size: 16px; margin-bottom: 10px;">What You Can Do</h3>
            <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Browse our curated collection of art and fashion</li>
              <li>Save your favorite pieces to your wishlist</li>
              <li>Earn loyalty points with every purchase</li>
              <li>Get personalized recommendations</li>
              <li>Download certificates of authenticity</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: #0a0a0a; color: white; padding: 12px 30px; text-decoration: none; font-size: 12px; letter-spacing: 2px;">
              START SHOPPING
            </a>
          </div>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Sinipo Art Studio. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),

  newsletter: (email, content) => ({
    subject: content.subject || 'Latest from Sinipo Art Studio',
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #fafaf8;">
        <div style="background: #0a0a0a; padding: 40px 20px; text-align: center;">
          <h1 style="color: #c8a830; font-size: 28px; margin: 0; font-weight: 300;">SINIPO ART STUDIO</h1>
          <p style="color: #ffffff; font-size: 12px; letter-spacing: 3px; margin-top: 8px;">STRONGER TOGETHER</p>
        </div>
        
        <div style="padding: 40px 20px;">
          ${content.body}
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            You received this email because you subscribed to our newsletter.
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
            <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${email}" style="color: #c8a830;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `
  })
};

// Send email function
export const sendEmail = async (to, template, data) => {
  try {
    const emailSettings = getEmailSettings();
    const disabledByType =
      (template === 'orderConfirmation' && !emailSettings.orderConfirmationEnabled) ||
      (template === 'shippingUpdate' && !emailSettings.shippingUpdateEnabled) ||
      (template === 'newsletter' && !emailSettings.newsletterEnabled);

    if (disabledByType) {
      return { success: false, skipped: true, error: `${template} emails are disabled` };
    }

    const transporter = createTransporter();
    const emailContent = emailTemplates[template](data);
    const fromAddress = emailSettings.fromAddress || emailSettings.smtpUser || process.env.SMTP_USER;
    const fromName = emailSettings.fromName || 'Sinipo Art Studio';
    const replyTo = emailSettings.replyToAddress || fromAddress;

    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      replyTo,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Send order confirmation
export const sendOrderConfirmation = async (order) => {
  return await sendEmail(order.email, 'orderConfirmation', order);
};

// Send shipping update
export const sendShippingUpdate = async (order, trackingNumber) => {
  return await sendEmail(order.email, 'shippingUpdate', { ...order, trackingNumber });
};

// Send welcome email
export const sendWelcomeEmail = async (user) => {
  return await sendEmail(user.email, 'welcomeEmail', user);
};

// Send newsletter
export const sendNewsletter = async (email, content) => {
  return await sendEmail(email, 'newsletter', content);
};

// Newsletter subscription storage
let newsletterSubscriptions = new Map();

// Subscribe to newsletter
export const subscribeToNewsletter = async (req, res) => {
  try {
    const { email, firstName } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Check if already subscribed
    if (newsletterSubscriptions.has(email)) {
      return res.status(400).json({
        error: 'Email already subscribed'
      });
    }

    // Add to subscriptions
    newsletterSubscriptions.set(email, {
      email,
      firstName: firstName || '',
      subscribedAt: new Date().toISOString(),
      isActive: true
    });

    // Send welcome email
    await sendWelcomeEmail({ email, firstName: firstName || 'Art Lover' });

    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      error: 'Failed to subscribe to newsletter',
      message: error.message
    });
  }
};

// Unsubscribe from newsletter
export const unsubscribeFromNewsletter = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    if (newsletterSubscriptions.has(email)) {
      newsletterSubscriptions.delete(email);
    }

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      error: 'Failed to unsubscribe',
      message: error.message
    });
  }
};

// Get newsletter subscribers (admin)
export const getNewsletterSubscribers = async (req, res) => {
  try {
    const subscribers = Array.from(newsletterSubscriptions.values());
    
    res.json({
      success: true,
      data: subscribers,
      count: subscribers.length
    });

  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      error: 'Failed to get subscribers',
      message: error.message
    });
  }
};

// Send newsletter to all subscribers
export const sendNewsletterToAll = async (req, res) => {
  try {
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        error: 'Subject and body are required'
      });
    }

    const subscribers = Array.from(newsletterSubscriptions.values()).filter(sub => sub.isActive);
    const results = [];

    for (const subscriber of subscribers) {
      const result = await sendNewsletter(subscriber.email, { subject, body });
      results.push({
        email: subscriber.email,
        success: result.success
      });
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Newsletter sent to ${successCount} out of ${subscribers.length} subscribers`,
      data: results
    });

  } catch (error) {
    console.error('Send newsletter error:', error);
    res.status(500).json({
      error: 'Failed to send newsletter',
      message: error.message
    });
  }
};

// Export for use in other modules
export { newsletterSubscriptions };
