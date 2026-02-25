from flask import Flask, render_template, request, jsonify
import random
import wave
import json
from vosk import Model, KaldiRecognizer

app = Flask(__name__)

# ---------------- Sample word bank ----------------
word_bank = {
    "jr_kg": {"easy": ["cat", "dog"], "medium": ["fish", "bird"], "hard": ["tiger", "elephant"]},
    "sr_kg": {"easy": ["apple", "ball"], "medium": ["chair", "table"], "hard": ["giraffe", "monkey"]},
    "1": {"easy": ["sun", "moon"], "medium": ["house", "tree"], "hard": ["computer", "bicycle"]}
    # Add all grades similarly...
}

# ---------------- Sample sentences ----------------
sentence_bank = {
    "1": {"easy": ["I like cats.", "The sun is bright."], 
          "medium": ["My house has a big garden.", "She is reading a book."], 
          "hard": ["The computer is very fast.", "We went to the zoo yesterday."]}
}

# ---------------- Home Page ----------------
@app.route("/")
def home():
    return render_template("index.html")

# ---------------- Module Pages ----------------
@app.route("/word.html")
def word_page():
    return render_template("word.html")

@app.route("/sentence.html")
def sentence_page():
    return render_template("sentence.html")

@app.route("/pronunciationsentence.html")
def formation_page():
    return render_template("pronunciationsentence.html")

@app.route("/module.html")
def module_page():
    return render_template("module.html")

@app.route("/listening.html")
def listening_page():
    return render_template("listening.html")

@app.route("/sentenceformation.html")
def sentenceformation_page():
    return render_template("sentenceformation.html")

@app.route("/wordtosentence.html")
def wordtosentence_page():
    return render_template("wordtosentence.html")

# ---------------- APIs ----------------
@app.route("/get_word")
def get_word():
    grade = request.args.get("grade")
    level = request.args.get("level")
    words = word_bank.get(grade, {}).get(level, ["hello"])
    return jsonify({"word": random.choice(words)})

@app.route("/get_sentence")
def get_sentence():
    grade = request.args.get("grade")
    level = request.args.get("level")
    sentences = sentence_bank.get(grade, {}).get(level, ["Hello world."])
    return jsonify({"sentence": random.choice(sentences)})

@app.route("/check_word", methods=["POST"])
def check_word():
    word = request.form.get("word", "").lower()
    audio_file = request.files["audio"]

    # Save audio temporarily
    filename = "temp.wav"
    audio_file.save(filename)

    wf = wave.open(filename, "rb")
    rec = KaldiRecognizer(model, wf.getframerate())
    recognized = ""
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            pass
    result_json = json.loads(rec.FinalResult())
    recognized = result_json.get("text","").lower()

    score = 100 if recognized == word else max(0, 80)  # simple scoring
    return jsonify({"recognized": recognized, "score": score})

if __name__ == "__main__":
    app.run(debug=True)

import requests

@app.route("/check_sentence", methods=["POST"])
def check_sentence():
    sentence = request.form.get("sentence", "")
    lt_url = "http://localhost:8081/v2/check"

    payload = {
        "text": sentence,
        "language": "en-US"
    }

    try:
        resp = requests.post(lt_url, data=payload)
        result = resp.json()  # contains matches
        # Apply corrections from LanguageTool suggestions
        corrected = sentence
        matches = result.get("matches", [])
        # sort by offset descending to not break indices
        matches.sort(key=lambda m: m["offset"], reverse=True)
        for m in matches:
            if m.get("replacements"):
                corrected = corrected[:m["offset"]] + m["replacements"][0]["value"] + corrected[m["offset"] + m["length"]:]
        return jsonify({"recognized": corrected, "matches": matches})
    except Exception as e:
        return jsonify({"recognized": sentence, "matches": [], "error": str(e)})
# ---------------- Run App ----------------
if __name__ == "__main__":
    app.run(debug=True)
