# Đưa "Giấc mơ Sổ Chung" lên server (Docker + Cloudflare Tunnel)

Tài liệu này dành cho người làm tay trên **Windows Server** đã cài **Docker Desktop (WSL2)** và có sẵn **cloudflared chạy như dịch vụ Windows** với tunnel cấu hình bằng `config.yml`. Đọc spec 01 mục 7 để hiểu mô hình.

**Sáu địa chỉ và cổng trên server** (chỉ mở trên `127.0.0.1`; bên trong container các cổng vẫn là 8081–8086, nhưng anh không cần quan tâm):

| Phần | Địa chỉ | Cổng trên server (mặc định) |
|---|---|---|
| hub | https://stem-block.blockchainptit.com | 18081 |
| Làng Giấy | https://sb-lang-giay.blockchainptit.com | 18082 |
| Làng Dệt | https://sb-lang-det.blockchainptit.com | 18083 |
| Làng Khắc Dấu | https://sb-lang-khac-dau.blockchainptit.com | 18084 |
| Làng Bạc | https://sb-lang-bac.blockchainptit.com | 18085 |
| Đồ họa | https://sb-assets.blockchainptit.com | 18086 |

Tất cả lệnh dưới đây chạy trong **PowerShell** trên server, trừ khi ghi khác.

**Có gì mới ở mốc 2 (thế giới mở 3D, model `.glb`):**
- **Thế giới mở (bước W1 đến W3):** chợ và 4 làng nằm trong MỘT cảnh 3D ở hub, địa chỉ `https://stem-block.blockchainptit.com/cho`. Đi từ chợ theo đường đất tới cổng từng làng rồi bước thẳng vào làng, không còn chuyển trang. **4 subdomain làng (`sb-lang-*`) chỉ còn là trang bài học và game** (`/lang/<id>/man/<n>`): `/` và `/lang/<id>` của subdomain làng tự chuyển sang `https://stem-block.blockchainptit.com/cho?tu=<id làng>` (nhờ `VITE_HUB_URL` trong `deploy/.env`); nút "Về làng" ở cuối mỗi màn cũng về đó. Không có cấu hình server, Caddy hay Cloudflare nào mới: vẫn 6 hostname, 6 cổng như cũ.
- **Dung lượng tải của thế giới mở** (đo bằng Chrome, bản build): lần đầu vào `/cho` (bước X3, làng Giấy bán kính 125) khoảng **20,8 MB ở mức Thấp và 22,2 MB ở mức Vừa, Cao khi nhiệm vụ ở Làng Giấy** (gồm model khoảng 19,6 đến 21,1 MB, ảnh 0,7 MB, mã 0,5 MB); khi nhiệm vụ ở làng khác thì lúc cảnh sẵn sàng là 19,7 MB (Thấp) và 20,6 MB (Vừa, Cao), và vùng Làng Giấy chỉ tải thêm **4,1 MB (Thấp) hay 5,1 MB (Vừa, Cao)** khi người chơi đi vào, tổng cao nhất 25,7 MB; các làng chưa dựng chỉ tải thêm khi người chơi đi tới gần (số đo bước W2: Làng Dệt khoảng 3,4 MB, Khắc Dấu 1,9 MB, Bạc 1,6 MB ở mức Cao). Trình duyệt lưu lại nên lần sau nhẹ hơn.
- Hub có trang `/cho` (thế giới mở 3D, vào bằng đường dẫn `https://stem-block.blockchainptit.com/cho`; `/cho?tu=<id làng>` và `/cho?mo=<id làng>` là đường dẫn trong game). Không cần cấu hình thêm: Caddy trả `index.html` cho mọi đường dẫn không phải file. Các trang `/dev/*` (kể cả `/dev/portraits`) chỉ có khi chạy dev, không có trên bản deploy.
- Model 3D (`.glb`) nằm trong `assets-build/models/` và được phục vụ bởi `sb-assets` như ảnh (cùng `VITE_ASSETS_URL`; không có biến `VITE_*` mới): `Content-Type: model/gltf-binary`, CORS `*`, tên có mã băm 8 ký tự thì `immutable`. `assets-build/` đã nặng khoảng 46 MB (40 MB là model), còn thế giới mở tải khoảng 20 đến 21,5 MB ở lần vào đầu (tải theo cảnh và theo làng, trình duyệt lưu lại).
- Ảnh hướng dẫn chơi nằm ở `assets-build/ui/huong-dan/` (10 ảnh WebP, khoảng 0,7 MB), do `pnpm guide:capture` chụp từ game rồi `pnpm assets:build` nén; làm trên máy dev, server chỉ nhận qua `git pull`.
- `assets-build/` được commit vào Git; **trên server không có `assets/` (bản gốc) nên không chạy `pnpm assets:build` ở server**. Mỗi lần đổi đồ họa: chạy `pnpm assets:build` trên máy dev, commit `assets-build/` (không có `_preview/`), rồi `git pull` và dựng lại trên server (mục f).

Muốn đổi cổng (nếu bị trùng) thì sửa `HUB_PORT`, `LANG_GIAY_PORT`, `LANG_DET_PORT`, `LANG_KHAC_DAU_PORT`, `LANG_BAC_PORT`, `ASSETS_PORT` trong `deploy/.env` (mục a.2), rồi nhớ dùng đúng số mới ở mục (b).

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

### 3. Kiểm tra cổng còn trống

Trước khi chạy, chắc chắn 6 cổng 18081–18086 chưa có chương trình nào dùng:

```powershell
netstat -ano | findstr :1808
```

- **Không in ra dòng nào** (hoặc chỉ có dòng trạng thái `TIME_WAIT`, không có `LISTENING`): cổng trống, làm tiếp.
- **Có dòng `LISTENING` ở cổng nào đó** (ví dụ `127.0.0.1:18083 ... LISTENING 4321`): cổng đó đã bị chiếm. Xem chương trình nào bằng `tasklist /fi "PID eq 4321"` (thay 4321 bằng số cuối dòng). Nếu không tắt được chương trình đó, đổi cổng tương ứng trong `deploy/.env` (ví dụ `LANG_DET_PORT=18183`) và dùng số mới ở mục (b) và các lệnh kiểm tra bên dưới.

### 4. Dựng và chạy

```powershell
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

Lần đầu mất vài phút (tải thư viện, chạy `pnpm check:text`, `pnpm test`, `pnpm build`). **Nếu test đỏ, quá trình build dừng** và không tạo container: đọc lỗi in ra, báo lại cho người code.

### 5. Kiểm tra tại chỗ

```powershell
docker ps                    # cột STATUS phải là "Up ... (healthy)" sau khoảng 40 giây
curl.exe -I http://localhost:18081
curl.exe -I http://localhost:18082
curl.exe -I http://localhost:18083
curl.exe -I http://localhost:18084
curl.exe -I http://localhost:18085
curl.exe -I http://localhost:18086/manifest.json
```

Mỗi lệnh phải trả `HTTP/1.1 200 OK`. Riêng cổng 18086 phải có dòng `Access-Control-Allow-Origin: *`. Cũng có thể mở http://localhost:18081 … 18086 bằng trình duyệt trên server. Nếu hub mở được nhưng hình trống: đó là vì `VITE_ASSETS_URL` trỏ ra `https://sb-assets…` mà tunnel chưa làm (mục b); làm xong mục b là có hình.

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
    service: http://localhost:18081
  - hostname: sb-lang-giay.blockchainptit.com
    service: http://localhost:18082
  - hostname: sb-lang-det.blockchainptit.com
    service: http://localhost:18083
  - hostname: sb-lang-khac-dau.blockchainptit.com
    service: http://localhost:18084
  - hostname: sb-lang-bac.blockchainptit.com
    service: http://localhost:18085
  - hostname: sb-assets.blockchainptit.com
    service: http://localhost:18086
  - service: http_status:404
```

Kiểm tra file hợp lệ:

```powershell
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://sb-assets.blockchainptit.com   # phải in ra service http://localhost:18086
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
- [ ] **Đọc truyện lần đầu (bước X1):** ở cửa sổ ẩn danh bấm "Chơi thử" (hoặc đăng ký tài khoản mới): vào `/truyen`, không có nút "Bỏ qua", phải lật hết 14 trang, trang cuối có nút "Vào chợ phiên" mở `/cho`; tải lại `/cho` thì vào thẳng (không đọc lại). Gõ thẳng `https://stem-block.blockchainptit.com/cho` ở cửa sổ ẩn danh mới thì tự chuyển về `/truyen`. Tài khoản đã chơi từ trước và tài khoản giáo viên vào thẳng chợ.
- [ ] **Chơi thử không tài khoản:** mở cửa sổ ẩn danh, bấm "Chơi thử không cần tài khoản", chơi một trạm; cookie `sc_guest` có Domain `.blockchainptit.com` và Secure.
- [ ] **Google:** bấm "Đăng nhập bằng Google" từ hub và từ một làng; đăng nhập xong quay về đúng trang đang đứng.
- [ ] **Trang giáo viên:** đăng nhập tài khoản giáo viên, vào `/giao-vien`, tạo lớp, cho một học sinh nhập mã lớp, xem tiến độ, xuất CSV mở bằng Excel không lỗi dấu, **đặt lại mật khẩu** cho một học sinh dùng tên đăng nhập rồi đăng nhập thử bằng mật khẩu mới. Học sinh gõ `/giao-vien` thì bị đưa về trang chủ.
- [ ] **Thế giới mở (mốc 2):** mở `https://stem-block.blockchainptit.com/cho` bằng tài khoản đã đọc truyện (gõ thẳng đường dẫn, không được 404; trình duyệt mới tinh thì được đưa về `/truyen` trước): thanh tải chạy hết, đi được bằng W A S D (điện thoại: cần điều khiển bên trái), Bi bay theo, có mũi tên vàng dưới chân chỉ đường tới Làng Giấy. F12 → Network: các file `.glb` lấy từ `https://sb-assets.blockchainptit.com/models/...` trả 200, `Content-Type: model/gltf-binary`, `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=31536000, immutable`; không lỗi CORS đỏ trong Console. Lần đầu khoảng 20 đến 21,5 MB (xem cột "transferred").
- [ ] **Đi từ chợ vào Làng Giấy:** từ chỗ xuất hiện đi theo mũi tên về phía bắc, qua biển chỉ đường "Làng Giấy", tới cổng; bước qua cổng là vào làng (không chuyển trang, không giật hình đáng kể). Lần đầu có cảnh mở đầu của bác An rồi 4 thẻ "Em có biết?"; thấy 3 biển gỗ, bác An, xưởng làm giấy, ao, đình. Ba cổng còn lại có then gỗ và dây đỏ, bấm E thì Bi báo "Cổng làng đóng…".
- [ ] **Subdomain làng chuyển về hub:** mở `https://sb-lang-giay.blockchainptit.com/` và `https://sb-lang-giay.blockchainptit.com/lang/lang-giay`: cả hai tự chuyển sang `https://stem-block.blockchainptit.com/cho?tu=lang-giay` (đứng trong làng cạnh 3 biển). Bấm E ở biển màn 1 thì sang `https://sb-lang-giay.blockchainptit.com/lang/lang-giay/man/1` (trang bài học vẫn ở subdomain); cuối màn bấm "Về làng" thì quay lại đúng chỗ trong làng. Làm tương tự với `sb-lang-det`, `sb-lang-khac-dau`, `sb-lang-bac` (chỉ cần thấy chuyển về `/cho?tu=<id>`).
- [ ] **Trao Trang Sổ Vàng (dùng tài khoản học sinh mới hoặc chơi thử ẩn danh):** ở Làng Giấy chơi xong màn 3 rồi vào lại làng (hoặc bước qua cổng) thì bác An trao trang (ô trang 1 sáng); xong cảnh thì dòng nhiệm vụ đổi thành "Đến Làng Dệt…", đi theo mũi tên về cổng Làng Dệt (phía nam chợ): tới gần cổng thì then gỗ và dây đỏ rơi, Bi nói "Một trang rồi! Cổng Làng Dệt đã mở."; tải lại không chiếu lại; ghi tiến độ rồi mở bằng máy khác cùng tài khoản cũng không chiếu lại.
- [ ] **Mượt khi vào làng (cần máy thật):** trên máy tính và điện thoại, đi từ chợ vào Làng Giấy rồi sang Làng Dệt: không có chỗ nào khựng thấy rõ (đo trên máy dev: khung chậm nhất dưới 50 ms ở cả 3 mức chất lượng). Nếu có, ghi lại máy, mức chất lượng, và vào lúc nào.
- [ ] **Điện thoại thật:** mở bằng 4G (không dùng Wi-Fi của server): đăng nhập, chơi Bài 1 đến hết, xoay ngang/dọc, không cuộn ngang trang.
- [ ] **Dung lượng tải trang đầu:** F12 → Network → bỏ chọn "Disable cache" → tải lại (Ctrl+Shift+R) → xem dòng cuối "transferred": trang chủ hub khoảng 100 KB chữ + hình nền. Ghi lại con số để so sau này.
- [ ] **Cache đúng:** F12 → Network, bấm một file trong `/assets/`: có `Cache-Control: public, max-age=31536000, immutable`; còn `index.html` và `manifest.json` là `no-cache`.
- [ ] Sau khi khởi động lại server (mục e): trang tự lên lại khi đã có người đăng nhập Windows.

---

## (h) Danh sách lệnh chạy trên server (qua Remote Desktop) cho bản có thế giới mở

Chỉ làm khi người code báo "xong, được deploy". Mỗi lệnh chạy trong **PowerShell** trên server; nếu một lệnh báo lỗi thì dừng lại, đọc lỗi và báo lại, không chạy tiếp.

```powershell
# 1. Vào thư mục mã nguồn, xem đang ở nhánh nào và chưa có thay đổi dở
cd D:\so-chung
git status
git branch --show-current          # phải là main

# 2. Lấy bản mới
git pull

# 3. Kiểm tra deploy/.env vẫn đủ 2 dòng Supabase, VITE_HUB_URL, VITE_ASSETS_URL, VITE_COOKIE_DOMAIN=.blockchainptit.com (KHÔNG in nội dung ra màn hình nơi người khác thấy)
Select-String -Path deploy\.env -Pattern '^VITE_(HUB_URL|ASSETS_URL|COOKIE_DOMAIN|LANG_[A-Z_]+_URL)='

# 4. Dựng lại và chạy (mất vài phút; test đỏ thì dừng, không tạo container mới)
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
docker image prune -f

# 5. Kiểm tra tại chỗ: cả 6 cổng phải trả 200
docker ps
foreach ($p in 18081,18082,18083,18084,18085) { curl.exe -s -o NUL -w "$p %{http_code}`n" http://localhost:$p/ }
curl.exe -I http://localhost:18086/manifest.json
curl.exe -s -o NUL -w "cho %{http_code}`n" http://localhost:18081/cho                       # phải 200 (Caddy trả index.html)
curl.exe -s -o NUL -w "man1 %{http_code}`n" http://localhost:18082/lang/lang-giay/man/1     # phải 200

# 6. Kiểm tra từ ngoài (qua Cloudflare)
curl.exe -s -o NUL -w "hub %{http_code}`n" https://stem-block.blockchainptit.com/cho
curl.exe -s -o NUL -w "assets %{http_code}`n" https://sb-assets.blockchainptit.com/manifest.json

# 7. Nếu cần khởi động lại tunnel (chỉ khi mục 6 báo 502/1033)
Restart-Service Cloudflared
Get-Service Cloudflared
```

Rồi làm các mục trong (g) bằng trình duyệt thật. **Quay lại bản cũ** nếu có lỗi nặng: `git log --oneline -5` để tìm mã commit trước, `git checkout <mã>`, chạy lại bước 4; khi muốn đi tiếp thì `git checkout main`.

---

## (i) Cloudflare: tạo Cache Rule cho `sb-assets` (làm tay trên trang web Cloudflare)

Mặc định Cloudflare **không** lưu cache file `.glb` ở biên (chỉ lưu các đuôi file phổ biến như ảnh, CSS, JS). Không có rule này thì mỗi người chơi tải lại 20 MB model từ server của mình mỗi lần vào `/cho` (trình duyệt đã lưu thì nhẹ hơn, nhưng người chơi mới nào cũng chạm tới server). Rule này chỉ ảnh hưởng hostname `sb-assets`.

1. Đăng nhập https://dash.cloudflare.com → chọn tên miền **blockchainptit.com**.
2. Menu trái: **Caching → Cache Rules** (hoặc **Rules → Overview → Cache Rules**). Bấm **Create rule**.
3. **Rule name:** `sb-assets: lưu cache model và ảnh`.
4. **When incoming requests match…** chọn **Custom filter expression** → **Edit expression**, dán:
   ```
   (http.host eq "sb-assets.blockchainptit.com")
   ```
   (hoặc dùng ô chọn: Field = *Hostname*, Operator = *equals*, Value = `sb-assets.blockchainptit.com`).
5. **Then…**
   - **Cache eligibility:** *Eligible for cache*.
   - **Edge TTL:** *Use cache-control header if present, cache request with Cloudflare's default TTL if not*. (Server đã gửi `immutable, max-age=31536000` cho file có mã băm và `no-cache` cho `manifest.json`, nên Cloudflare lưu file model lâu còn `manifest.json` luôn hỏi lại.)
   - **Browser TTL:** *Respect origin TTL*.
   - Các mục còn lại để mặc định.
6. Bấm **Deploy** (hoặc **Save**). Quy tắc có hiệu lực sau vài giây.
7. **Kiểm tra** (PowerShell, chạy 2 lần liên tiếp cho cùng một file; thay tên file bằng một file thật trong `https://sb-assets.blockchainptit.com/manifest.json`, ví dụ `models/env/gieng-lang`):
   ```powershell
   curl.exe -sI https://sb-assets.blockchainptit.com/models/env/gieng-lang.<mã-băm>.glb | findstr /i "cf-cache-status cache-control content-type"
   ```
   Lần 1 thường `cf-cache-status: MISS` (hoặc `DYNAMIC` nếu rule chưa nhận), lần 2 phải là **`HIT`**. Nếu lần 2 vẫn `DYNAMIC`/`BYPASS`: kiểm tra lại biểu thức ở bước 4 (đúng hostname) và rule đã **Deploy**.
8. Nếu sau này đổi model: file mới có mã băm mới nên tự là bản mới; không cần xóa cache. Muốn ép xóa tất cả: **Caching → Configuration → Purge Cache → Custom purge → Hostname** `sb-assets.blockchainptit.com`.

---

## Chạy thử Docker ngay trên máy (không cần tên miền)

Dùng khi muốn kiểm tra image trước khi lên server:

```powershell
Copy-Item deploy\.env.localtest.example deploy\.env.localtest
notepad deploy\.env.localtest        # điền 2 dòng Supabase
docker compose --env-file deploy/.env.localtest -f deploy/docker-compose.yml up -d --build
```

Rồi mở http://localhost:18081 … 18086. Bản này dùng địa chỉ `localhost` và không đặt `VITE_COOKIE_DOMAIN`, nên đăng nhập ở hub **không** tự dùng chung sang các làng (khác cổng nên khác nguồn gốc); chỉ dùng để xem đủ 6 cổng chạy đúng. Tắt bằng `docker compose -f deploy/docker-compose.yml down`.

---

## Khi có sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Trình duyệt báo **502 / 1033** | Container chưa chạy hoặc cloudflared chưa nhận cấu hình. Kiểm tra `docker ps`, `curl.exe -I http://localhost:18081`, rồi `Restart-Service Cloudflared`. |
| Build dừng ở bước `pnpm test` hoặc `check:text` | Có test đỏ ở bản code này. Không deploy bản đó; báo người code kèm đoạn lỗi. |
| Hub mở được nhưng **không có hình** | Mở `https://sb-assets.blockchainptit.com/manifest.json`; nếu không mở được thì tunnel/DNS của `sb-assets` chưa đúng (mục b). |
| Đăng nhập ở hub nhưng **làng không nhận** | Kiểm tra `VITE_COOKIE_DOMAIN=.blockchainptit.com` (có dấu chấm ở đầu) trong `deploy/.env`, rồi dựng lại. Xóa cookie cũ của trình duyệt. |
| Đăng nhập Google quay về **trang lỗi** | Redirect URLs trong Supabase thiếu hostname đang dùng (mục c). |
| Đổi `.env` nhưng **không thấy thay đổi** | Cần dựng lại: `up -d --build`. Trình duyệt giữ bản cũ thì Ctrl+Shift+R. |
