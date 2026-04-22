"""SMTP + Sent-folder helper used by all DepScope transactional email.

Emails are relayed through the submission endpoint (mail.cuttalo.com:587,
STARTTLS + AUTH) and a copy is persisted in the sender's IMAP ``Sent`` folder
via IMAPS APPEND. Saving to the Sent folder is a hard requirement coming from
the ``feedback_save_sent_emails`` rule: without it, messages disappear for the
human operator who reads the depscope@cuttalo.com mailbox through Roundcube.
"""
from __future__ import annotations

import imaplib
import os
import smtplib
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Optional


SMTP_HOST = os.getenv("DEPSCOPE_SMTP_HOST") or os.getenv("SMTP_HOST", "mail.cuttalo.com")
SMTP_PORT = int(os.getenv("DEPSCOPE_SMTP_PORT") or os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("DEPSCOPE_SMTP_USER") or os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("DEPSCOPE_SMTP_PASS") or os.getenv("SMTP_PASS", "")
SMTP_FROM_EMAIL = os.getenv("DEPSCOPE_SMTP_FROM", "depscope@cuttalo.com")
SMTP_FROM_NAME = os.getenv("DEPSCOPE_SMTP_FROM_NAME", "DepScope")

# IMAP config for saving a copy in Sent. Defaults reuse the SMTP credentials
# since depscope@cuttalo.com authenticates against the same Dovecot backend.
IMAP_HOST = os.getenv("DEPSCOPE_IMAP_HOST") or os.getenv("IMAP_HOST", SMTP_HOST)
IMAP_PORT = int(os.getenv("DEPSCOPE_IMAP_PORT") or os.getenv("IMAP_PORT", "993"))
IMAP_USER = os.getenv("DEPSCOPE_IMAP_USER") or os.getenv("IMAP_USER", SMTP_USER or SMTP_FROM_EMAIL)
IMAP_PASS = os.getenv("DEPSCOPE_IMAP_PASS") or os.getenv("IMAP_PASS", SMTP_PASS)
IMAP_SENT_MAILBOX = os.getenv("DEPSCOPE_IMAP_SENT", "Sent")
IMAP_TIMEOUT = int(os.getenv("DEPSCOPE_IMAP_TIMEOUT", "10"))


def _build_message(
    to: str,
    subject: str,
    html: str,
    plain: str,
    in_reply_to: Optional[str] = None,
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain="depscope.dev")
    msg["Reply-To"] = SMTP_FROM_EMAIL
    msg["List-Unsubscribe"] = f"<mailto:{SMTP_FROM_EMAIL}?subject=unsubscribe>"
    msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg["Auto-Submitted"] = "auto-generated"
    msg["X-Mailer"] = "DepScope"
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to

    # RFC-2046 says the last part is the preferred one, so HTML goes last.
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def send_email(
    to: str,
    subject: str,
    html: str,
    plain: str,
    in_reply_to: Optional[str] = None,
) -> bool:
    """Send a multipart HTML+plain email and save a copy in Sent.

    Returns ``True`` when SMTP relay succeeded. Failure to save a copy in the
    Sent folder is logged but does not flip the return value &mdash; the
    outbound message has already been accepted by the relay at that point.
    """
    msg = _build_message(to, subject, html, plain, in_reply_to=in_reply_to)
    raw = msg.as_string()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.ehlo()
            # Use STARTTLS + AUTH when credentials are provided (public submission
            # endpoint on port 587). Falls back to unauthenticated relay when
            # talking to an internal trusted relay on port 25.
            if SMTP_USER and SMTP_PASS:
                s.starttls()
                s.ehlo()
                s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_FROM_EMAIL, [to], raw)
    except Exception as exc:  # pragma: no cover - relay handles most problems
        print(f"[mailer] SMTP send failed to={to!r} subject={subject!r}: {exc}")
        return False

    # Best-effort: persist to the sender's Sent mailbox via IMAP APPEND.
    try:
        _save_to_sent(raw)
    except Exception as exc:  # pragma: no cover
        print(f"[mailer] save_to_sent failed: {exc}")
    return True


def _save_to_sent(raw_message: str) -> None:
    """Append ``raw_message`` to the Sent mailbox via IMAPS.

    Uses IMAP APPEND with the ``\\Seen`` flag so the message shows up under
    "Sent" (not as an unread item) in Roundcube. Replaces the legacy SSH +
    ``doveadm save`` path which required LAN reachability to the mail VM.
    """
    if not IMAP_PASS:
        raise RuntimeError("IMAP_PASS not configured")

    data = raw_message.encode("utf-8")
    # RFC-3501 date-time literal for APPEND.
    date_time = imaplib.Time2Internaldate(time.time())

    imap = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, timeout=IMAP_TIMEOUT)
    try:
        imap.login(IMAP_USER, IMAP_PASS)
        typ, _ = imap.append(IMAP_SENT_MAILBOX, "(\\Seen)", date_time, data)
        if typ != "OK":
            raise RuntimeError(f"IMAP APPEND returned {typ}")
    finally:
        try:
            imap.logout()
        except Exception:
            pass
