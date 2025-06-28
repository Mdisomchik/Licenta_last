from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
from sentence_transformers import SentenceTransformer, util
import torch
import functools
import time
import re
from langdetect import detect

app = Flask(__name__)
CORS(app)

# Use smaller, faster models
summarizer = pipeline("summarization", model="facebook/bart-base")  # Smaller than bart-large-cnn
reply_generator = pipeline("text-generation", model="distilgpt2")  # Much smaller than DialoGPT
semantic_model = SentenceTransformer('paraphrase-MiniLM-L3-v2')  # Lightweight semantic search
reply_correction = pipeline("text2text-generation", model="vennify/t5-base-grammar-correction")

# Pre-defined templates for common scenarios
reply_templates = {
    'rejection': {
        'formal': "Thank you for your application. After careful consideration, we regret to inform you that we will not be proceeding further. We appreciate your interest and wish you success in your future endeavors.",
        'friendly': "Thanks for applying! While we won't be moving forward at this time, we really appreciate your interest. Best of luck with your search!",
        'concise': "Thank you for applying. We won't be proceeding further at this time."
    },
    'meeting': {
        'formal': "I confirm receipt of your meeting request. I am available at the proposed time and look forward to our discussion.",
        'friendly': "Thanks for setting this up! The time works great for me - looking forward to our chat!",
        'concise': "Confirmed. See you then."
    }
}

# Keywords for context detection
context_keywords = {
    'rejection': ['regret', 'unfortunately', 'not proceed', 'other candidates'],
    'meeting': ['meeting', 'schedule', 'appointment', 'discuss', 'call']
}

# Cache for email embeddings
email_cache = {
    'embeddings': None,
    'emails': [],
    'last_update': None
}

def detect_context(text):
    """Detect email context based on keywords"""
    text = text.lower()
    for context, keywords in context_keywords.items():
        if any(keyword in text for keyword in keywords):
            return context
    return None

def cache_with_timeout(timeout_seconds=300):
    """Decorator for caching function results with timeout"""
    def decorator(func):
        cache = {}
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            now = time.time()
            if key in cache:
                result, timestamp = cache[key]
                if now - timestamp < timeout_seconds:
                    return result
            result = func(*args, **kwargs)
            cache[key] = (result, now)
            return result
        return wrapper
    return decorator

def ensure_full_sentence(summary):
    # Ensure the summary ends at the last full stop
    if '.' in summary:
        return summary[:summary.rfind('.')+1]
    return summary

def strip_html_tags(text):
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

def extract_latest_message(email_text):
    # Remove headers
    body = re.sub(r'^(From|To|Cc|Bcc|Subject|Date):.*$', '', email_text, flags=re.MULTILINE)
    # Remove quoted/forwarded blocks
    body = re.split(r'(-{2,}.*(Original Message|Forwarded message).*)', body, maxsplit=1)[0]
    # Remove repeated signatures (e.g., lines starting with 'Thank you', 'Best,', etc.)
    body = re.sub(r'(?i)^(thank you|thanks|best regards|regards|sincerely|cheers|dear|yours truly|with appreciation)[\s\S]*$', '', body, flags=re.MULTILINE)
    # Remove extra whitespace
    return body.strip()

@app.route('/summarize', methods=['POST'])
@cache_with_timeout(300)  # Cache for 5 minutes
def summarize():
    data = request.get_json()
    text = data.get('text', '')

    # Pre-process text to remove custom tags and fix potential encoding issues
    cleaned_text = re.sub(r'#\w+[?:]\s*', '', text)
    cleaned_text = cleaned_text.replace('', '').strip()

    if not cleaned_text or len(cleaned_text) < 30:
        return jsonify({'error': 'Text is too short to summarize.'}), 400
    try:
        summaries = summarizer(cleaned_text, max_length=512, min_length=30, do_sample=False)
        if summaries:
            summary = summaries[0]['summary_text']
            summary = ensure_full_sentence(summary)
            return jsonify({'summary': summary})
        else:
            return jsonify({'error': 'Could not generate summary for this text.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/smart-reply', methods=['POST'])
def smart_reply():
    try:
        data = request.json
        text = data.get('text', '')
        tone = data.get('tone', 'Friendly')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Clean input
        text = strip_html_tags(text)
        text = text.strip()
        text = extract_latest_message(text)

        # Minimal prompt
        prompt = f"{text}\n\nReply:"
        outputs = reply_generator(
            prompt,
            max_new_tokens=80,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            no_repeat_ngram_size=4,
            early_stopping=True
        )
        reply = outputs[0]['generated_text'].split('Reply:')[-1].strip()

        # Remove lines that look like instructions or meta-comments
        reply_lines = [line.strip() for line in reply.split('\n') if line.strip() and not re.match(r'^(-|include|use|receive|do not|note:|the following|prompt|instructions|meta-comment)', line.strip(), re.IGNORECASE)]
        reply = ' '.join(reply_lines).strip()
        if not reply or not re.search(r'[a-zA-Z]', reply):
            context = detect_context(text)
            if context and context in reply_templates:
                return jsonify({'replies': [reply_templates[context][tone.lower()]]})
            fallback = "Thank you for your email. I will respond shortly." if tone == 'formal' else "Thanks! I'll get back to you soon!"
            return jsonify({'replies': [fallback]})
        return jsonify({'replies': [reply]})
    except Exception as e:
        fallback = "Thank you for your email. I will respond shortly." if tone == 'formal' else "Thanks! I'll get back to you soon!"
        return jsonify({'replies': [fallback]})

@app.route('/api/ai-assistant', methods=['POST'])
def ai_assistant():
    data = request.json
    query = data.get('query', '').lower()
    emails = data.get('emails', [])
    
    # Simple but fast search implementation
    results = []
    query_words = set(query.split())
    
    for email in emails:
        text = f"{email.get('subject', '')} {email.get('body', '')}".lower()
        if any(word in text for word in query_words):
            # Find the most relevant snippet
            start = max(0, text.find(next(word for word in query_words if word in text)) - 50)
            snippet = text[start:start + 200] + ('...' if len(text) > start + 200 else '')
            
            results.append({
                'id': email.get('id'),
                'subject': email.get('subject'),
                'snippet': snippet
            })
            
            if len(results) >= 5:  # Limit results for performance
                break
                
    return jsonify({
        'result': f'Found {len(results)} emails.' if results else 'No results found.',
        'emails': results
    })

@app.route('/api/correct-reply', methods=['POST'])
def correct_reply():
    data = request.json
    text = data.get('text', '')
    try:
        # The model expects input like: "gec: your sentence"
        prompt = f"gec: {text}"
        outputs = reply_correction(prompt, max_length=128, num_return_sequences=1)
        improved = outputs[0]['generated_text'].strip()
        return jsonify({'corrected': improved})
    except Exception as e:
        print(f"Error in correct-reply: {str(e)}")
        return jsonify({'corrected': text})

if __name__ == '__main__':
    app.run(port=5000)