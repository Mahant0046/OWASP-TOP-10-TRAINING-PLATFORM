# data.py
MODULES = [
    {"id":"A01","title":"Broken Access Control","points":200,"difficulty":"Medium"},
    {"id":"A02","title":"Cryptographic Failures","points":250,"difficulty":"Hard"},
    {"id":"A03","title":"Injection","points":300,"difficulty":"Hard"},
    {"id":"A04","title":"Insecure Design","points":200,"difficulty":"Medium"},
    {"id":"A05","title":"Security Misconfiguration","points":150,"difficulty":"Easy"},
    {"id":"A06","title":"Vulnerable & Outdated Components","points":200,"difficulty":"Medium"},
    {"id":"A07","title":"Identification & Authentication Failures","points":200,"difficulty":"Medium"},
    {"id":"A08","title":"Software & Data Integrity Failures","points":250,"difficulty":"Hard"},
    {"id":"A09","title":"Security Logging & Monitoring Failures","points":150,"difficulty":"Easy"},
    {"id":"A10","title":"Server-Side Request Forgery (SSRF)","points":250,"difficulty":"Hard"},
]

DEFAULT_QUESTIONS = {
    "A01":[{"q":"Cause of Access Control issues?","a":["Ineffective authz","No TLS","XSS"],"c":0}],
    "A02":[{"q":"Bad crypto practice?","a":["Plaintext passwords","Use AES-GCM"],"c":0}],
}
