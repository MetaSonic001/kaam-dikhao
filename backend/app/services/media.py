"""Photo pipeline: EXIF facts -> privacy-safe public copy (EXIF stripped, faces blurred)."""
from __future__ import annotations

import hashlib
import io
from datetime import datetime, timedelta, timezone

import cv2
import numpy as np
from PIL import ExifTags, Image, ImageOps

MAX_SIDE = 1600
THUMB_SIDE = 480
_face = None
_plate = None
# Three small YOLOv9 plate detectors (about 7 MB each, ONNX, MIT via open-image-models, CPU only).
# Different input sizes miss different plates, so their detections are combined; blurring twice is harmless.
PLATE_MODELS = ["yolo-v9-t-256-license-plate-end2end", "yolo-v9-t-384-license-plate-end2end", "yolo-v9-t-512-license-plate-end2end"]


def _ratio(v) -> float:
    try:
        return float(v[0]) / float(v[1]) if isinstance(v, tuple) else float(v)
    except Exception:  # noqa: BLE001
        return float("nan")


def _dms(vals, ref) -> float | None:
    try:
        d, m, s = (float(x) for x in vals)
        deg = d + m / 60 + s / 3600
        return -deg if ref in ("S", "W") else deg
    except Exception:  # noqa: BLE001
        return None


def read_exif(img: Image.Image) -> dict:
    """Extract only what verification needs: GPS, capture time, image size. No serials, no device model."""
    out: dict = {"width": img.width, "height": img.height, "has_exif": False}
    try:
        ex = img.getexif()
    except Exception:  # noqa: BLE001
        return out
    if not ex:
        return out
    out["has_exif"] = True
    try:
        sub = ex.get_ifd(0x8769)
        raw = sub.get(0x9003) or ex.get(0x0132)
        off = sub.get(0x9011)
        if raw:
            dt = datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
            tz = timezone(timedelta(hours=5, minutes=30))  # India Standard Time default
            if off and isinstance(off, str) and len(off) >= 6:
                sign = -1 if off[0] == "-" else 1
                tz = timezone(sign * timedelta(hours=int(off[1:3]), minutes=int(off[4:6])))
            out["captured_at"] = dt.replace(tzinfo=tz).isoformat()
    except Exception:  # noqa: BLE001
        pass
    try:
        gps = ex.get_ifd(0x8825)
        if gps:
            names = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps.items()}
            lat = _dms(names.get("GPSLatitude"), names.get("GPSLatitudeRef"))
            lng = _dms(names.get("GPSLongitude"), names.get("GPSLongitudeRef"))
            if lat is not None and lng is not None and not (lat == 0 and lng == 0):
                out["lat"], out["lng"] = round(lat, 6), round(lng, 6)
            if names.get("GPSHPositioningError") is not None:
                out["accuracy_m"] = round(_ratio(names["GPSHPositioningError"]), 1)
    except Exception:  # noqa: BLE001
        pass
    return out


def _face_cascade():
    global _face
    if _face is None:
        _face = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    return _face


def blur_faces(img: Image.Image) -> tuple[Image.Image, int]:
    arr = np.array(img.convert("RGB"))
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    faces = _face_cascade().detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(36, 36))
    for (x, y, w, h) in faces:
        pad = int(0.25 * w)
        x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(arr.shape[1], x + w + pad), min(arr.shape[0], y + h + pad)
        roi = arr[y0:y1, x0:x1]
        k = max(15, (x1 - x0) // 2 | 1)
        arr[y0:y1, x0:x1] = cv2.GaussianBlur(roi, (k, k), 0)
    return Image.fromarray(arr), int(len(faces))


def _plate_detector():
    global _plate
    if _plate is None:
        from open_image_models import create_detector

        _plate = [create_detector(m, conf_thresh=0.3) for m in PLATE_MODELS]
    return _plate


def blur_plates(img: Image.Image) -> tuple[Image.Image, int]:
    """Blur (never read) vehicle number plates: a plate number is personal data, so we only obscure it."""
    try:
        arr = np.array(img.convert("RGB"))
        bgr = arr[:, :, ::-1]
        found = [d for det in _plate_detector() for d in det.predict(bgr)]
    except Exception:  # noqa: BLE001  # model unavailable: moderators still review every photo
        return img, -1
    for d in found:
        b = d.bounding_box
        pad_x, pad_y = int(0.15 * (b.x2 - b.x1)), int(0.35 * (b.y2 - b.y1))
        x0, y0 = max(0, int(b.x1) - pad_x), max(0, int(b.y1) - pad_y)
        x1, y1 = min(arr.shape[1], int(b.x2) + pad_x), min(arr.shape[0], int(b.y2) + pad_y)
        roi = arr[y0:y1, x0:x1]
        if roi.size:
            small = cv2.resize(roi, (max(2, (x1 - x0) // 14), max(2, (y1 - y0) // 14)), interpolation=cv2.INTER_LINEAR)
            arr[y0:y1, x0:x1] = cv2.resize(small, (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST)  # pixelate
    return Image.fromarray(arr), len(found)


def sharpness(img: Image.Image) -> float:
    g = cv2.cvtColor(np.array(img.convert("RGB").resize((640, int(640 * img.height / img.width)))), cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(g, cv2.CV_64F).var())


def process_photo(raw: bytes) -> dict:
    """Returns dict(sha256, exif, public_jpeg, thumb_jpeg, faces_blurred, sharpness, width, height)."""
    sha = hashlib.sha256(raw).hexdigest()
    img = Image.open(io.BytesIO(raw))
    exif = read_exif(img)
    img = ImageOps.exif_transpose(img).convert("RGB")
    if max(img.size) > MAX_SIDE:
        img.thumbnail((MAX_SIDE, MAX_SIDE))
    blurred, faces = blur_faces(img)
    blurred, plates = blur_plates(blurred)
    sharp = sharpness(blurred)
    buf = io.BytesIO()
    blurred.save(buf, "JPEG", quality=82, optimize=True)  # no exif= -> metadata stripped
    th = blurred.copy()
    th.thumbnail((THUMB_SIDE, THUMB_SIDE))
    tb = io.BytesIO()
    th.save(tb, "JPEG", quality=76)
    return {"sha256": sha, "exif": exif, "public_jpeg": buf.getvalue(), "thumb_jpeg": tb.getvalue(),
            "faces_blurred": faces, "plates_blurred": plates, "sharpness": round(sharp, 1), "width": img.width, "height": img.height}
