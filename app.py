from __future__ import annotations
import json, os, re, secrets, traceback
from email.parser import BytesParser
from email.policy import default
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

from engine import analyze, CRITERIA, RISK_NAMES
from ui import LOGIN_HTML, APP_HTML

HOST='0.0.0.0'
PORT=int(os.environ.get('PORT','8000'))
APP_PASSWORD=os.environ.get('APP_PASSWORD','12345+')
COOKIE='auii_session'
SESSIONS=set()
ALLOWED={'.pdf','.docx','.txt','.md','.csv'}

def parse_multipart(headers, body:bytes):
    ctype=headers.get('Content-Type','')
    raw=(f'Content-Type: {ctype}\r\nMIME-Version: 1.0\r\n\r\n').encode()+body
    msg=BytesParser(policy=default).parsebytes(raw)
    fields={}; files=[]
    if not msg.is_multipart(): return fields,files
    for p in msg.iter_parts():
        name=p.get_param('name',header='content-disposition'); fn=p.get_filename(); data=p.get_payload(decode=True) or b''
        if fn: files.append({'field':name,'filename':fn,'data':data})
        elif name: fields[name]=data.decode('utf-8','replace')
    return fields,files

class Handler(BaseHTTPRequestHandler):
    server_version='AUII-Web/2.0'
    def log_message(self,fmt,*args):
        print(f'{self.address_string()} - {fmt%args}',flush=True)
    def send_bytes(self,code,data,ctype='text/plain; charset=utf-8',headers=None):
        if isinstance(data,str):data=data.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type',ctype); self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('X-Frame-Options','DENY'); self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
        if headers:
            for k,v in headers.items():self.send_header(k,v)
        self.end_headers(); self.wfile.write(data)
    def send_json(self,code,obj):
        self.send_bytes(code,json.dumps(obj,ensure_ascii=False).encode('utf-8'),'application/json; charset=utf-8')
    def authed(self):
        c=self.headers.get('Cookie',''); m=re.search(r'(?:^|;\s*)'+re.escape(COOKIE)+r'=([^;]+)',c)
        return bool(m and m.group(1) in SESSIONS)
    def cookie_header(self,sess):
        secure='; Secure' if self.headers.get('X-Forwarded-Proto','').lower()=='https' else ''
        return f'{COOKIE}={sess}; HttpOnly; SameSite=Strict; Path=/{secure}'
    def do_GET(self):
        u=urlparse(self.path)
        if u.path=='/health':return self.send_json(200,{'ok':True,'criteria':30,'risks':20,'login_required':True})
        if u.path=='/':
            if self.authed():return self.send_bytes(302,b'',headers={'Location':'/app'})
            return self.send_bytes(200,LOGIN_HTML,'text/html; charset=utf-8')
        if u.path=='/app':
            if not self.authed():return self.send_bytes(302,b'',headers={'Location':'/'})
            return self.send_bytes(200,APP_HTML,'text/html; charset=utf-8')
        if u.path=='/criteria':
            if not self.authed():return self.send_json(403,{'error':'Parola doğrulanmadı.'})
            return self.send_json(200,{'criteria':CRITERIA,'risks':RISK_NAMES})
        if u.path=='/logout':
            c=self.headers.get('Cookie',''); m=re.search(r'(?:^|;\s*)'+re.escape(COOKIE)+r'=([^;]+)',c)
            if m:SESSIONS.discard(m.group(1))
            return self.send_bytes(302,b'',headers={'Set-Cookie':f'{COOKIE}=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/','Location':'/'})
        return self.send_bytes(404,'Bulunamadı.')
    def do_POST(self):
        u=urlparse(self.path)
        if u.path=='/login':
            try:
                length=int(self.headers.get('Content-Length','0'))
                if length>4096:return self.send_bytes(413,'İstek çok büyük.')
                body=self.rfile.read(length).decode('utf-8','replace'); form=parse_qs(body); password=form.get('password',[''])[0]
                if not secrets.compare_digest(password,APP_PASSWORD):
                    html=LOGIN_HTML.replace('<!--ERROR-->','<div class="error">Parola hatalı.</div>')
                    return self.send_bytes(401,html,'text/html; charset=utf-8')
                sess=secrets.token_urlsafe(32); SESSIONS.add(sess)
                return self.send_bytes(302,b'',headers={'Set-Cookie':self.cookie_header(sess),'Location':'/app'})
            except Exception:return self.send_bytes(400,'Giriş isteği işlenemedi.')
        if not self.authed():return self.send_json(403,{'error':'Parola doğrulanmadı.'})
        if u.path!='/analyze':return self.send_json(404,{'error':'Bulunamadı.'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<=0:return self.send_json(400,{'error':'Boş istek.'})
            if length>60*1024*1024:return self.send_json(413,{'error':'Toplam dosya boyutu 60 MB sınırını aşıyor.'})
            body=self.rfile.read(length); fields,upl=parse_multipart(self.headers,body)
            try:meta=json.loads(fields.get('metadata','{}'))
            except Exception:return self.send_json(400,{'error':'Başvuru bilgileri okunamadı.'})
            valid=[]
            for f in upl:
                ext=Path(f['filename']).suffix.lower()
                if ext not in ALLOWED:continue
                if len(f['data'])>20*1024*1024:continue
                valid.append(f)
            if not valid:return self.send_json(400,{'error':'PDF, DOCX, TXT, MD veya CSV biçiminde en az bir belge yükleyin.'})
            return self.send_json(200,analyze(meta,valid))
        except Exception as e:
            traceback.print_exc(); return self.send_json(500,{'error':f'İnceleme sırasında hata oluştu: {e}'})

def main():
    print(f'READY 0.0.0.0:{PORT}',flush=True)
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()

if __name__=='__main__':main()
