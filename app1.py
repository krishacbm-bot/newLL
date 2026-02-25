from flask import Flask, render_template, request, jsonify
from textblob import TextBlob
import language_tool_python

app = Flask(__name__)
tool = language_tool_python.LanguageTool('en-US')

# Sample word list
words = {
    "benevolent": "well meaning and kindly",
    "meticulous": "showing great attention to detail; very careful and precise",
    "audacious": "showing a willingness to take surprisingly bold risks"
}

@app.route('/')
def index():
    return render_template('sentece.html', words=words)

@app.route('/check', methods=['POST'])
def check_sentence():
    data = request.json
    word = data.get('word')
    sentence = data.get('sentence', '')

    response = {"word_used": False, "grammar": [], "spelling": ""}

    # Check if the word is used
    if word.lower() in sentence.lower():
        response["word_used"] = True

    # Grammar check
    matches = tool.check(sentence)
    response["grammar"] = [f"{m.ruleId}: {m.message}" for m in matches]

    # Spelling check
    corrected = str(TextBlob(sentence).correct())
    response["spelling"] = corrected

    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
