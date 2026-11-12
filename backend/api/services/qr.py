from io import BytesIO
from urllib.parse import quote

import qrcode


def make_qr_png(text: str) -> bytes:
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(text)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def upi_intent(upi_id: str, name: str, amount, note: str = "") -> str:
    url = f"upi://pay?pa={quote(str(upi_id))}&pn={quote(str(name))}&am={quote(str(amount))}&cu=INR"
    if note:
        url += f"&tn={quote(str(note))}"
    return url
