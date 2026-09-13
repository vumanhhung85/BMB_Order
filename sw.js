/* ============================================================
   BOOM MUSIC BOX — Gọi phục vụ · Service Worker
   Nhiệm vụ:
   1. Đủ điều kiện để Chrome cho "Thêm vào màn hình chính" (PWA).
   2. Giữ sẵn giao diện trong máy → mất wifi vài giây vẫn mở được app,
      chỉ phần gửi đơn là cần mạng.

   !!! MỖI LẦN SỬA GIAO DIỆN NHỚ TĂNG SỐ PHIÊN BẢN Ở DÒNG DƯỚI.
       Không tăng thì máy cũ có thể giữ bản cache cũ lâu hơn cần thiết.
   ============================================================ */
var VER   = 'bmb-order-v2.1';
var FILES = [
  './',
  './index.html',
  './jsqr.min.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './Logo_BoomBox.png'
];

/* Cài đặt: nạp sẵn từng file, file nào thiếu thì bỏ qua chứ không hỏng cả gói */
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(VER).then(function(c){
      return Promise.all(FILES.map(function(f){
        return c.add(new Request(f, {cache:'reload'})).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

/* Kích hoạt: xoá cache của các phiên bản cũ */
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ return k===VER ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;

  /* Chỉ xử lý GET cùng tên miền. Mọi lời gọi API sang Apps Script,
     lấy IP, tải font… để trình duyệt tự làm — TUYỆT ĐỐI không cache. */
  if(req.method !== 'GET') return;
  var url;
  try{ url = new URL(req.url); }catch(err){ return; }
  if(url.origin !== self.location.origin) return;

  /* Trang HTML: ưu tiên mạng để anh sửa index.html là thấy ngay bản mới,
     mất mạng mới lấy bản trong máy. */
  if(req.mode === 'navigate' || (req.headers.get('accept')||'').indexOf('text/html') >= 0){
    e.respondWith(
      fetch(req).then(function(r){
        var copy = r.clone();
        caches.open(VER).then(function(c){ c.put(req, copy); });
        return r;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* File tĩnh (js, ảnh, manifest): lấy trong máy cho nhanh,
     đồng thời tải bản mới về để lần sau dùng. */
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(r){
        if(r && r.status === 200){
          var copy = r.clone();
          caches.open(VER).then(function(c){ c.put(req, copy); });
        }
        return r;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});

/* Trang gọi khi muốn ép dùng bản mới ngay */
self.addEventListener('message', function(e){
  if(e.data === 'skipWaiting') self.skipWaiting();
});
