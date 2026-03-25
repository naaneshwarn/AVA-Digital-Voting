from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition_models
import dlib
import numpy as np
import base64
import cv2
from PIL import Image

app = Flask(__name__)
CORS(app)

# -----------------------------------------------
# LOAD dlib MODELS DIRECTLY (bypass face_recognition wrappers)
# -----------------------------------------------
detector = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor(
    face_recognition_models.pose_predictor_five_point_model_location()
)
face_encoder = dlib.face_recognition_model_v1(
    face_recognition_models.face_recognition_model_location()
)

# -----------------------------
# SANITIZE IMAGE (Windows safe)
# -----------------------------
def sanitize_image(base64_str):
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]

        img_data = base64.b64decode(base64_str)
        np_arr = np.frombuffer(img_data, np.uint8)

        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            print("❌ Decode failed")
            return None

        img = cv2.resize(img, (640, 480))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        from io import BytesIO
        buf = BytesIO()
        Image.fromarray(img, 'RGB').save(buf, format='PNG')
        buf.seek(0)
        img = np.array(Image.open(buf).convert('RGB'), dtype=np.uint8)

        print(
            "✅ Sanitized image:",
            img.shape, img.dtype,
            "contiguous:", img.flags['C_CONTIGUOUS'],
            "writeable:", img.flags['WRITEABLE'],
        )
        return img
    except Exception as e:
        print("❌ Sanitize error:", e)
        return None


# -----------------------------
# GET FACE ENCODING (raw dlib)
# -----------------------------
def get_face_encoding(image):
    if image is None:
        return None
    try:
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        Image.fromarray(image, 'RGB').save(tmp_path)
        dlib_img = dlib.load_rgb_image(tmp_path)
        os.remove(tmp_path)

        detections = detector(dlib_img, 1)
        if len(detections) == 0:
            print("❌ No face detected")
            return None

        shape = shape_predictor(dlib_img, detections[0])
        encoding = np.array(face_encoder.compute_face_descriptor(dlib_img, shape))
        return encoding
    except Exception as e:
        print("❌ Encoding error:", e)
        return None


# -----------------------------
# VERIFY FACE ENDPOINT
# -----------------------------
@app.route("/verify-face", methods=["POST"])
def verify_face():
    try:
        data = request.json
        live_images = data.get("liveImages", [])
        registered_image = data.get("registeredImage")

        if not live_images or not registered_image:
            return jsonify({"match": False, "error": "Missing images"})

        reg_img = sanitize_image(registered_image)
        if reg_img is None:
            return jsonify({"match": False, "error": "Invalid registered image"})

        reg_encoding = get_face_encoding(reg_img)
        if reg_encoding is None:
            return jsonify({"match": False, "error": "No face in registered image"})

        distances = []
        for i, img_str in enumerate(live_images):
            img = sanitize_image(img_str)
            if img is None:
                print(f"❌ Frame {i}: sanitize failed")
                continue
            encoding = get_face_encoding(img)
            if encoding is None:
                print(f"❌ Frame {i}: no face")
                continue
            distance = float(np.linalg.norm(reg_encoding - encoding))
            distances.append(distance)
            print(f"📸 Frame {i}: distance = {distance:.4f}")

        if not distances:
            return jsonify({"match": False, "error": "No valid face detected in live images"})

        # -----------------------------------------------
        # STRICT VERIFICATION LOGIC
        # -----------------------------------------------

        # 1. Tighter threshold — dlib's recommended value is 0.6.
        #    Lower = stricter. 0.5 gives very high accuracy.
        THRESHOLD = 0.50

        avg_distance = sum(distances) / len(distances)
        min_distance = min(distances)

        # 2. Consensus check — require at least 60% of captured frames
        #    to be within threshold, not just one lucky frame.
        frames_matched = sum(1 for d in distances if d < THRESHOLD)
        match_ratio = frames_matched / len(distances)
        CONSENSUS_REQUIRED = 0.60  # at least 60% of frames must match

        # 3. Final decision: avg must also be under threshold AND
        #    consensus must be met. Both conditions required.
        match = (avg_distance < THRESHOLD) and (match_ratio >= CONSENSUS_REQUIRED)

        print(f"📊 Distances     : {[round(d, 4) for d in distances]}")
        print(f"📊 Avg distance  : {avg_distance:.4f}")
        print(f"📊 Min distance  : {min_distance:.4f}")
        print(f"📊 Frames matched: {frames_matched}/{len(distances)} ({match_ratio*100:.1f}%)")
        print(f"📊 Threshold     : {THRESHOLD}")
        print(f"📊 Consensus req : {CONSENSUS_REQUIRED*100:.0f}%")
        print(f"✅ MATCH         : {match}")

        return jsonify({
            "match": match,
            "distances": distances,
            "avg_distance": avg_distance,
            "min_distance": min_distance,
            "frames_matched": frames_matched,
            "total_frames": len(distances),
            "match_ratio": match_ratio,
            "threshold": THRESHOLD,
            "consensus_required": CONSENSUS_REQUIRED,
        })

    except Exception as e:
        print("🔥 SERVER ERROR:", e)
        return jsonify({"match": False, "error": "Server crashed"}), 500


if __name__ == "__main__":
    app.run(debug=True)