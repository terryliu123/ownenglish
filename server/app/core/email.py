import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import logging

logger = logging.getLogger(__name__)

# 腾讯企业邮配置
SMTP_HOST = "smtp.exmail.qq.com"
SMTP_PORT = 465
SMTP_USER = "terry.liu@lugertech.com"
SMTP_PASSWORD = "cdtWBDeVyW5WDP34"
FROM_NAME = "OwnEnglish"


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        # 使用纯ASCII主题，避免中文编码问题
        msg["Subject"] = subject
        # From必须是纯邮箱地址，不能有任何中文或特殊格式
        msg["From"] = SMTP_USER
        msg["To"] = to_email

        html_part = MIMEText(html_body, "html", "utf-8")
        msg.attach(html_part)

        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, [to_email], msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_verification_code(email: str, code: str) -> bool:
    """Send email verification code."""
    subject = "Your Verification Code"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">教学辅助系统</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <h2 style="color: #333; font-size: 18px; margin: 0 0 16px;">验证码</h2>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">您好！</p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">您的注册验证码为：</p>
        <div style="background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">{code}</span>
        </div>
        <p style="color: #999; font-size: 12px; line-height: 1.6;">验证码有效期为 <strong>5 分钟</strong>，请勿将验证码告知他人。</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 11px;">如果这不是您的操作，请忽略此邮件。</p>
      </div>
    </div>
    """
    return send_email(email, subject, html)


def send_password_reset_email(email: str, token: str, temp_password: str) -> bool:
    """Send password reset email with temporary password and reset link."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    subject = "Password Reset"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">教学辅助系统</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <h2 style="color: #333; font-size: 18px; margin: 0 0 16px;">密码重置</h2>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">您好！</p>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">您申请了密码重置，请使用以下临时密码登录：</p>
        <div style="background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 4px; font-family: 'Courier New', monospace;">{temp_password}</span>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">或者点击以下链接直接重置密码：</p>
        <div style="margin: 20px 0;">
          <a href="{reset_link}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 500;">立即重置密码</a>
        </div>
        <p style="color: #999; font-size: 12px; line-height: 1.6;">临时密码有效期为 <strong>30 分钟</strong>，登录后请及时修改密码。</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 11px;">如果这不是您的操作，请忽略此邮件，并确保您的账号安全。</p>
      </div>
    </div>
    """
    return send_email(email, subject, html)
