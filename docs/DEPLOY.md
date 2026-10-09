# Đưa "Giấc mơ Sổ Chung" lên server (Docker + Cloudflare Tunnel)

Tài liệu này dành cho người làm tay trên **Windows Server** đã cài **Docker Desktop (WSL2)** và có sẵn **cloudflared chạy như dịch vụ Windows** với tunnel cấu hình bằng `config.yml`. Đọc spec 01 mục 7 để hiểu mô hình.

**Sáu địa chỉ và cổng** (cổng chỉ mở trên `127.0.0.1` của server):

| Phần | Địa chỉ | Cổng |
|---|---|---|
| hub | https://stem-block.blockchainptit.com | 8081 |
| Làng Giấy | https://sb-lang-giay.blockchainptit.com | 8082 |
| Làng Dệt | https://sb-lang-det.blockchainptit.com | 8083 |
| Làng Khắc Dấu | https://sb-lang-khac-dau.blockchainptit.com | 8084 |
| Làng Bạc | https://sb-lang-bac.blockchainptit.com | 8085 |
| Đồ họa | https://sb-assets.blockchainptit.com | 8086 |

Tất cả lệnh dưới đây chạy trong **PowerShell** trên server, trừ khi ghi khác.

---

## (a) Trên server: lấy mã nguồn, dựng và chạy container

### 1. Lấy mã nguồn từ GitHub (repo riêng tư)

Cách khuyên dùng: **deploy key chỉ đọc** (chỉ đọc được đúng repo này, không ghi được).

1. Tạo cặp khóa trên server (bấm Enter khi hỏi mật khẩu để bỏ trống):
   ```powershell
   ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\so-chung-deploy" -C "so-chung-server"
   Get-Content "$env:USERPROFILE\.ssh\so-chung-deploy.pub"
   ```
2. Trên GitHub: repo → **Settings → Deploy keys → Add deploy key**. Dán nội dung vừa in ra. **Không tick** "Allow write access". Lưu lại.
3. Cho ssh biết dùng khóa này. Mở (hoặc tạo) file `%USERPROFILE%\.ssh\config` và thêm:
   ```
   Host github-so-chung
     HostName github.com
     User git
     IdentityFile ~/.ssh/so-chung-deploy
     IdentitiesOnly yes
   ```
4. Clone về thư mục thích hợp, ví dụ `D:\so-chung`:
   ```powershell
   git clone git@github-so-chung:vanh985-coder/stem-blockchainv5.git D:\so-chung
   cd D:\so-chung
   ```
   Lần đầu ssh hỏi "Are you sure you want to continue connecting" thì gõ `yes`.

Cách khác: **token chỉ đọc**. Trên GitHub: Settings → Developer settings → Fine-grained tokens → chọn đúng repo này, quyền **Contents: Read-only**. Rồi `git clone https://github.com/vanh985-coder/stem-blockchainv5.git` và nhập token khi được hỏi mật khẩu. Không dán token vào file nào trong repo.

### 2. Tạo `deploy/.env`

```powershell
Copy-Item deploy\.env.example deploy\.env
notepad deploy\.env
```

Điền 2 dòng Supabase (Project Settings → API): `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (khóa **publishable/anon**). Các dòng còn lại đã đúng cho 6 địa chỉ ở trên; kiểm tra lại `VITE_COOKIE_DOMAIN=.blockchainptit.com` (có dấu chấm ở đầu) và `VITE_USERNAME_EMAIL_DOMAIN=hs.blockchainptit.com`.

> **Tuyệt đối không** để service role key hay secret key trong file này. File `deploy/.env` không được commit (đã nằm trong `.gitignore`).
> Các biến `VITE_*` được "đóng cứng" vào bản build: đổi giá trị thì phải dựng lại (mục f).

### 3. Dựng và chạy

```powershell
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

Lần đầu mất vài phút (tải thư viện, chạy `pnpm check:text`, `pnpm test`, `pnpm build`). **Nếu test đỏ, quá trình build dừng** và không tạo container: đọc lỗi in ra, báo lại cho người code.

### 4. Kiểm tra tại chỗ

```powershell
docker ps                    # cột STATUS phải là "Up ... (healthy)" sau khoảng 40 giây
curl.exe -I http://localhost:8081
curl.exe -I http://localhost:8082
curl.exe -I http://localhost:8083
curl.exe -I http://localhost:8084
curl.exe -I http://localhost:8085
curl.exe -I http://localhost:8086/manifest.json
```

Mỗi lệnh phải trả `HTTP/1.1 200 OK`. Riêng cổng 8086 phải có dòng `Access-Control-Allow-Origin: *`. Cũng có thể mở http://localhost:8081 … 8086 bằng trình duyệt trên server. Nếu hub mở được nhưng hình trống: đó là vì `VITE_ASSETS_URL` trỏ ra `https://sb-assets…` mà tunnel chưa làm (mục b); làm xong mục b là có hình.

---

## (b) Cloudflare Tunnel: 6 hostname vào 6 cổng

### 1. Thêm 6 dòng ingress vào `config.yml`

Mở `config.yml` của tunnel. Với dịch vụ Windows, file thường nằm ở `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml` (hoặc thư mục `%USERPROFILE%\.cloudflared\` nếu anh cài theo cách đó). Nếu chưa chắc, xem dịch vụ đang dùng file nào:

```powershell
Get-CimInstance Win32_Service -Filter "Name='Cloudflared'" | Select-Object PathName
```

Thêm 6 dòng này vào phần `ingress:`, **trước** dòng cuối `- service: http_status:404` (dòng cuối cùng phải luôn là dòng không có `hostname`):

```yaml
ingress:
  # ... các dòng cũ của anh giữ nguyên ...
  - hostname: stem-block.blockchainptit.com
    service: http://localhost:8081
  - hostname: sb-lang-giay.blockchainptit.com
    service: http://localhost:8082
  - hostname: sb-lang-det.blockchainptit.com
    service: http://localhost:8083
  - hostname: sb-lang-khac-dau.blockchainptit.com
    service: http://localhost:8084
  - hostname: sb-lang-bac.blockchainptit.com
    service: http://localhost:8085
  - hostname: sb-assets.blockchainptit.com
    service: http://localhost:8086
  - service: http_status:404
```

Kiểm tra file hợp lệ:

```powershell
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://sb-assets.blockchainptit.com   # phải in ra service http://localhost:8086
```

### 2. Tạo bản ghi DNS cho 5 hostname mới

Thay `<tên-tunnel>` bằng tên tunnel của anh (xem bằng `cloudflared tunnel list`):

```powershell
cloudflared tunnel route dns <tên-tunnel> sb-lang-giay.blockchainptit.com
cloudflared tunnel route dns <tên-tunnel> sb-lang-det.blockchainptit.com
cloudflared tunnel route dns <tên-tunnel> sb-lang-khac-dau.blockchainptit.com
cloudflared tunnel route dns <tên-tunnel> sb-lang-bac.blockchainptit.com
cloudflared tunnel route dns <tên-tunnel> sb-assets.blockchainptit.com
```

`stem-block.blockchainptit.com` đã có DNS từ trước, nên không chạy lại. Nếu hostname này chưa có bản ghi (hoặc đang trỏ nơi khác), chạy thêm dòng tương tự cho nó; nếu báo "record already exists" thì xóa bản ghi cũ trong Cloudflare Dashboard → DNS rồi chạy lại.

### 3. Khởi động lại dịch vụ cloudflared

```powershell
Restart-Service Cloudflared
Get-Service Cloudflared      # Status phải là Running
```

(Tên dịch vụ thường là `Cloudflared`; xem tên đúng bằng `Get-Service *cloudflare*`.) Mở https://stem-block.blockchainptit.com và https://sb-assets.blockchainptit.com/manifest.json trên điện thoại hoặc máy khác để thử.

---

## (c) Supabase

1. **Authentication → URL Configuration:**
   - **Site URL:** `https://stem-block.blockchainptit.com`
   - **Redirect URLs** (thêm đủ 6 dòng; giữ các dòng `http://localhost:5173/**` … `5177/**` nếu vẫn còn chạy thử trên máy):
     ```
     https://stem-block.blockchainptit.com/**
     https://sb-lang-giay.blockchainptit.com/**
     https://sb-lang-det.blockchainptit.com/**
     https://sb-lang-khac-dau.blockchainptit.com/**
     https://sb-lang-bac.blockchainptit.com/**
     https://sb-assets.blockchainptit.com/**
     ```
2. **Edge Function đặt lại mật khẩu** phải dùng cùng tên miền email nội bộ với `VITE_USERNAME_EMAIL_DOMAIN`:
   ```powershell
   npx supabase secrets set USERNAME_EMAIL_DOMAIN=hs.blockchainptit.com
   ```
   > **Chú ý:** tài khoản tên đăng nhập đã tạo trước đây dưới tên miền khác (ví dụ `hs.ten-mien.vn`) có email cũ, nên **không đăng nhập được** khi đổi sang `hs.blockchainptit.com`. Tài khoản thử thì tạo lại; nếu đã có học sinh thật thì báo người code trước khi đổi.

---

## (d) Google Cloud (đăng nhập bằng Google)

1. Google Cloud Console → **APIs & Services → OAuth consent screen** (mục Branding / "Thương hiệu"):
   - **Authorized domains:** thêm `blockchainptit.com`.
   - Application home page: `https://stem-block.blockchainptit.com`; Privacy policy: `https://stem-block.blockchainptit.com/quyen-rieng-tu`.
2. Bấm **Publish app** để chuyển trạng thái sang **"In production"**. Nếu để "Testing" thì chỉ tài khoản thử mới đăng nhập được, học sinh sẽ bị chặn.
3. **Credentials → OAuth Client ID:** Authorized redirect URI vẫn là `https://<project>.supabase.co/auth/v1/callback` (không cần đổi).

---

## (e) Tự chạy lại sau khi server khởi động lại

1. Mở Docker Desktop → **Settings → General** → tick **"Start Docker Desktop when you sign in to your computer"**.
2. Container đã có `restart: unless-stopped`, nên Docker khởi động là container tự lên. Dịch vụ `cloudflared` là dịch vụ Windows nên tự chạy từ lúc bật máy.

**Giới hạn cần nhớ:** Docker Desktop là chương trình của phiên người dùng, nên **phải có một tài khoản Windows đăng nhập** thì Docker mới chạy. Sau khi khởi động lại server, trang sẽ báo lỗi 502 cho tới khi có người đăng nhập Windows. Khi nối Remote Desktop, anh **đóng cửa sổ (Disconnect)**, đừng chọn Sign out: Sign out sẽ tắt Docker. Nếu muốn server tự đăng nhập sau khi khởi động lại, có thể dùng công cụ Autologon của Microsoft Sysinternals (lưu ý: tài khoản đó sẽ đăng nhập sẵn trên máy; hãy dùng tài khoản riêng, quyền thấp).

Sau mỗi lần khởi động lại server, kiểm tra nhanh: `docker ps` (phải `healthy`) rồi mở https://stem-block.blockchainptit.com.

---

## (f) Cập nhật phiên bản mới

```powershell
cd D:\so-chung
git pull
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
docker image prune -f        # dọn image cũ cho đỡ tốn ổ đĩa
```

Container được thay bằng bản mới trong vài giây (có thể mất vài giây gián đoạn). Nếu bản mới có lỗi nặng, quay lại bản cũ: `git checkout <mã-commit-cũ>` rồi chạy lại lệnh `up -d --build`; xong thì `git checkout main` khi muốn đi tiếp.

Đổi nội dung `deploy/.env` (ví dụ đổi khóa Supabase) cũng phải chạy lại lệnh `up -d --build`.

Xem nhật ký: `docker logs so-chung-web --tail 100`.

---

## (g) Danh sách kiểm tra sau khi lên mạng

- [ ] Mở https://stem-block.blockchainptit.com: trang chủ hiện, có hình nền, không lỗi đỏ trong Console (F12).
- [ ] **Đăng nhập một lần dùng chung:** đăng ký/đăng nhập ở hub, rồi mở một làng (https://sb-lang-giay.blockchainptit.com): làng vẫn ở trạng thái đã đăng nhập. F12 → Application → Cookies: cookie `sb-…-auth-token` có **Domain `.blockchainptit.com`** và có dấu **Secure**.
- [ ] **Chơi thử và lưu:** vào Bài 1 ở Làng Giấy, hoàn thành một trạm, bấm "Về bản đồ" về hub; sao vừa đạt hiện ở bản đồ. Tải lại trang vẫn còn. Mở bằng máy khác cùng tài khoản vẫn thấy.
- [ ] **Chơi thử không tài khoản:** mở cửa sổ ẩn danh, bấm "Chơi thử không cần tài khoản", chơi một trạm; cookie `sc_guest` có Domain `.blockchainptit.com` và Secure.
- [ ] **Google:** bấm "Đăng nhập bằng Google" từ hub và từ một làng; đăng nhập xong quay về đúng trang đang đứng.
- [ ] **Trang giáo viên:** đăng nhập tài khoản giáo viên, vào `/giao-vien`, tạo lớp, cho một học sinh nhập mã lớp, xem tiến độ, xuất CSV mở bằng Excel không lỗi dấu, **đặt lại mật khẩu** cho một học sinh dùng tên đăng nhập rồi đăng nhập thử bằng mật khẩu mới. Học sinh gõ `/giao-vien` thì bị đưa về trang chủ.
- [ ] **Điện thoại thật:** mở bằng 4G (không dùng Wi-Fi của server): đăng nhập, chơi Bài 1 đến hết, xoay ngang/dọc, không cuộn ngang trang.
- [ ] **Dung lượng tải trang đầu:** F12 → Network → bỏ chọn "Disable cache" → tải lại (Ctrl+Shift+R) → xem dòng cuối "transferred": trang chủ hub khoảng 100 KB chữ + hình nền. Ghi lại con số để so sau này.
- [ ] **Cache đúng:** F12 → Network, bấm một file trong `/assets/`: có `Cache-Control: public, max-age=31536000, immutable`; còn `index.html` và `manifest.json` là `no-cache`.
- [ ] Sau khi khởi động lại server (mục e): trang tự lên lại khi đã có người đăng nhập Windows.

---

## Chạy thử Docker ngay trên máy (không cần tên miền)

Dùng khi muốn kiểm tra image trước khi lên server:

```powershell
Copy-Item deploy\.env.localtest.example deploy\.env.localtest
notepad deploy\.env.localtest        # điền 2 dòng Supabase
docker compose --env-file deploy/.env.localtest -f deploy/docker-compose.yml up -d --build
```

Rồi mở http://localhost:8081 … 8086. Bản này dùng địa chỉ `localhost` và không đặt `VITE_COOKIE_DOMAIN`, nên đăng nhập ở hub **không** tự dùng chung sang các làng (khác cổng nên khác nguồn gốc); chỉ dùng để xem đủ 6 cổng chạy đúng. Tắt bằng `docker compose -f deploy/docker-compose.yml down`.

---

## Khi có sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Trình duyệt báo **502 / 1033** | Container chưa chạy hoặc cloudflared chưa nhận cấu hình. Kiểm tra `docker ps`, `curl.exe -I http://localhost:8081`, rồi `Restart-Service Cloudflared`. |
| Build dừng ở bước `pnpm test` hoặc `check:text` | Có test đỏ ở bản code này. Không deploy bản đó; báo người code kèm đoạn lỗi. |
| Hub mở được nhưng **không có hình** | Mở `https://sb-assets.blockchainptit.com/manifest.json`; nếu không mở được thì tunnel/DNS của `sb-assets` chưa đúng (mục b). |
| Đăng nhập ở hub nhưng **làng không nhận** | Kiểm tra `VITE_COOKIE_DOMAIN=.blockchainptit.com` (có dấu chấm ở đầu) trong `deploy/.env`, rồi dựng lại. Xóa cookie cũ của trình duyệt. |
| Đăng nhập Google quay về **trang lỗi** | Redirect URLs trong Supabase thiếu hostname đang dùng (mục c). |
| Đổi `.env` nhưng **không thấy thay đổi** | Cần dựng lại: `up -d --build`. Trình duyệt giữ bản cũ thì Ctrl+Shift+R. |
