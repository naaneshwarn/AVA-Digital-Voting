from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition_models
import dlib
import numpy as np
import base64
import cv2
from PIL import Image
from io import BytesIO
import tempfile, os

app = Flask(__name__)
CORS(app)

# -----------------------------------------------
# LOAD dlib MODELS — all from face_recognition_models package
# No manual .dat file downloads needed
# -----------------------------------------------
detector = dlib.get_frontal_face_detector()

# 68-point model — bundled inside face_recognition_models package
shape_predictor_68 = dlib.shape_predictor(
    face_recognition_models.pose_predictor_model_location()
)

# 5-point model — for fast face encoding
shape_predictor_5 = dlib.shape_predictor(
    face_recognition_models.pose_predictor_five_point_model_location()
)

# Face encoder
face_encoder = dlib.face_recognition_model_v1(
    face_recognition_models.face_recognition_model_location()
)

print("✅ All models loaded successfully from face_recognition_models package")

# -----------------------------------------------
# dlib 68-point landmark indices for eyes
# Left eye:  points 36-41
# Right eye: points 42-47
# -----------------------------------------------
LEFT_EYE_IDX  = list(range(36, 42))
RIGHT_EYE_IDX = list(range(42, 48))


# -----------------------------------------------
# EYE ASPECT RATIO (EAR)
# Formula: EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
# Low EAR  -> eye closed (blink)
# High EAR -> eye open
# -----------------------------------------------
def eye_aspect_ratio(eye_points):
    A = np.linalg.norm(eye_points[1] - eye_points[5])
    B = np.linalg.norm(eye_points[2] - eye_points[4])
    C = np.linalg.norm(eye_points[0] - eye_points[3])
    if C == 0:
        return 0.0
    return float((A + B) / (2.0 * C))


def get_eye_points(shape, indices):
    return np.array([[shape.part(i).x, shape.part(i).y] for i in indices], dtype=np.float64)


# -----------------------------------------------
# SANITIZE IMAGE
# -----------------------------------------------
def sanitize_image(base64_str):
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        np_arr   = np.frombuffer(img_data, np.uint8)
        img      = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return None
        img = cv2.resize(img, (640, 480))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        buf = BytesIO()
        Image.fromarray(img, 'RGB').save(buf, format='PNG')
        buf.seek(0)
        return np.array(Image.open(buf).convert('RGB'), dtype=np.uint8)
    except Exception as e:
        print("❌ Sanitize error:", e)
        return None


def load_dlib_image(image_np):
    """Save numpy image to temp file and load via dlib (most reliable on Windows)."""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
    Image.fromarray(image_np, 'RGB').save(tmp_path)
    dlib_img = dlib.load_rgb_image(tmp_path)
    os.remove(tmp_path)
    return dlib_img


# -----------------------------------------------
# GET FACE ENCODING (uses 5-point model)
# -----------------------------------------------
def get_face_encoding(dlib_img, detection):
    try:
        shape    = shape_predictor_5(dlib_img, detection)
        encoding = np.array(face_encoder.compute_face_descriptor(dlib_img, shape))
        return encoding
    except Exception as e:
        print("❌ Encoding error:", e)
        return None


# -----------------------------------------------
# GET EAR FOR BOTH EYES (uses 68-point model)
# Returns (left_ear, right_ear, avg_ear) or None
# -----------------------------------------------
def get_ear(dlib_img, detection):
    try:
        shape     = shape_predictor_68(dlib_img, detection)
        left_pts  = get_eye_points(shape, LEFT_EYE_IDX)
        right_pts = get_eye_points(shape, RIGHT_EYE_IDX)
        left_ear  = eye_aspect_ratio(left_pts)
        right_ear = eye_aspect_ratio(right_pts)
        return left_ear, right_ear, (left_ear + right_ear) / 2.0
    except Exception as e:
        print("❌ EAR error:", e)
        return None


# -----------------------------------------------
# LIVENESS ANALYSIS
# Blink check: EAR drops below 0.20 for 1-6 frames then recovers
# Eye-open check: 40% of frames must show EAR > 0.25
# Both must pass for liveness to be confirmed
# -----------------------------------------------
EAR_BLINK_THRESHOLD       = 0.20
EAR_OPEN_THRESHOLD        = 0.25
MIN_BLINKS_REQUIRED       = 1
OPEN_FRAME_RATIO_REQUIRED = 0.40
MAX_BLINK_FRAMES          = 6


def analyse_liveness(ear_sequence):
    if not ear_sequence:
        return {
            "blink_count"     : 0,
            "open_frame_ratio": 0.0,
            "liveness_passed" : False,
            "reason"          : "No EAR data collected",
        }

    # Blink state machine
    blink_count, in_blink, blink_frame_count = 0, False, 0
    for ear in ear_sequence:
        if ear < EAR_BLINK_THRESHOLD:
            if not in_blink:
                in_blink, blink_frame_count = True, 1
            else:
                blink_frame_count += 1
        else:
            if in_blink:
                if blink_frame_count <= MAX_BLINK_FRAMES:
                    blink_count += 1
                in_blink, blink_frame_count = False, 0
    if in_blink and blink_frame_count <= MAX_BLINK_FRAMES:
        blink_count += 1

    open_frames      = sum(1 for e in ear_sequence if e > EAR_OPEN_THRESHOLD)
    open_frame_ratio = open_frames / len(ear_sequence)
    blink_ok         = blink_count >= MIN_BLINKS_REQUIRED
    open_ok          = open_frame_ratio >= OPEN_FRAME_RATIO_REQUIRED

    if   not blink_ok and not open_ok:
        reason = f"No blink detected AND eyes not open enough ({open_frame_ratio*100:.0f}% open frames)"
    elif not blink_ok:
        reason = f"No blink detected across {len(ear_sequence)} frames"
    elif not open_ok:
        reason = f"Eyes not open enough ({open_frame_ratio*100:.0f}% open, need {OPEN_FRAME_RATIO_REQUIRED*100:.0f}%)"
    else:
        reason = "Liveness confirmed: blink detected + eyes open"

    return {
        "blink_count"     : blink_count,
        "open_frames"     : open_frames,
        "total_frames"    : len(ear_sequence),
        "open_frame_ratio": round(open_frame_ratio, 4),
        "liveness_passed" : blink_ok and open_ok,
        "reason"          : reason,
        "ear_sequence"    : [round(e, 4) for e in ear_sequence],
    }


# -----------------------------------------------
# VERIFY FACE  POST /verify-face
# Body: { "liveImages": [...base64 in ORDER], "registeredImage": "base64" }
# Send ~20-30 frames at ~10fps so a natural blink can occur
# -----------------------------------------------
@app.route("/verify-face", methods=["POST"])
def verify_face():
    try:
        data             = request.json
        live_images      = data.get("liveImages", [])
        registered_image = data.get("registeredImage")

        if not live_images or not registered_image:
            return jsonify({"match": False, "error": "Missing images"})

        # Registered image
        reg_img = sanitize_image(registered_image)
        if reg_img is None:
            return jsonify({"match": False, "error": "Invalid registered image"})

        reg_dlib       = load_dlib_image(reg_img)
        reg_detections = detector(reg_dlib, 1)
        if len(reg_detections) == 0:
            return jsonify({"match": False, "error": "No face found in registered image"})

        reg_encoding = get_face_encoding(reg_dlib, reg_detections[0])
        if reg_encoding is None:
            return jsonify({"match": False, "error": "Could not encode registered face"})

        # Process live frames
        distances    = []
        ear_sequence = []  # must stay in frame ORDER for blink detection

        for i, img_str in enumerate(live_images):
            img = sanitize_image(img_str)
            if img is None:
                continue

            dlib_img   = load_dlib_image(img)
            detections = detector(dlib_img, 1)
            if len(detections) == 0:
                continue

            enc = get_face_encoding(dlib_img, detections[0])
            if enc is not None:
                dist = float(np.linalg.norm(reg_encoding - enc))
                distances.append(dist)
                print(f"📸 Frame {i}: dist={dist:.4f}")

            ear_result = get_ear(dlib_img, detections[0])
            if ear_result is not None:
                l, r, avg = ear_result
                ear_sequence.append(avg)
                print(f"👁  Frame {i}: L={l:.3f} R={r:.3f} avg={avg:.3f}")

        if not distances:
            return jsonify({"match": False, "error": "No valid face detected in live images"})

        # Identity decision
        THRESHOLD          = 0.50
        CONSENSUS_REQUIRED = 0.60
        avg_distance       = sum(distances) / len(distances)
        min_distance       = min(distances)
        frames_matched     = sum(1 for d in distances if d < THRESHOLD)
        match_ratio        = frames_matched / len(distances)
        identity_match     = (avg_distance < THRESHOLD) and (match_ratio >= CONSENSUS_REQUIRED)

        # Liveness decision
        liveness = analyse_liveness(ear_sequence)

        # Final: both must pass
        final_match = identity_match and liveness["liveness_passed"]

        print(f"\n{'='*55}")
        print(f"📊 Identity | avg={avg_distance:.4f} matched={frames_matched}/{len(distances)} → {'✅ PASS' if identity_match else '❌ FAIL'}")
        print(f"👁  Liveness | blinks={liveness['blink_count']} open={liveness['open_frame_ratio']*100:.0f}% → {'✅ PASS' if liveness['liveness_passed'] else '❌ FAIL'}")
        print(f"🔐 FINAL    | {'✅ VERIFIED' if final_match else '❌ REJECTED'}")
        print(f"{'='*55}\n")

        return jsonify({
            "match": final_match,
            "identity": {
                "passed"            : identity_match,
                "avg_distance"      : round(avg_distance, 4),
                "min_distance"      : round(min_distance, 4),
                "distances"         : [round(d, 4) for d in distances],
                "frames_matched"    : frames_matched,
                "total_frames"      : len(distances),
                "match_ratio"       : round(match_ratio, 4),
                "threshold"         : THRESHOLD,
                "consensus_required": CONSENSUS_REQUIRED,
            },
            "liveness": liveness,
        })

    except Exception as e:
        print("🔥 SERVER ERROR:", e)
        import traceback; traceback.print_exc()
        return jsonify({"match": False, "error": "Server crashed"}), 500


if __name__ == "__main__":
    app.run(debug=True)