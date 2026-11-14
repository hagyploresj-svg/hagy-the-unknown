# HAGY: THE UNKNOWN — Bölüm 1: GECE NÖBETİ

Tarayıcıda oynanan 3D birinci şahıs korku oyunu.
Next.js 14 (App Router) + React 18 + Three.js + React Three Fiber + Zustand. Tüm dokular ve sesler kod ile üretilir — harici model/ses/resim dosyası yoktur.

**Amaç:** Terk edilmiş hastanede 3 sigortayı bul → jeneratörü çalıştır → doğudaki çıkış kapısından kaç. Seni bir yaratık takip ediyor.

---

## 1) `npm tanınmadı` sorunu — Node.js kurulumu (Windows)

PowerShell'de `npm` tanınmıyorsa Node.js kurulu değildir (ya da PATH'e eklenmemiştir).

1. https://nodejs.org adresinden **LTS** sürümünü indir ve kur (kurulumda "Add to PATH" seçili kalsın).
   Alternatif (PowerShell): `winget install OpenJS.NodeJS.LTS`
2. **PowerShell'i tamamen kapatıp yeniden aç** (PATH ancak yeni pencerede yenilenir). VS Code terminali kullanıyorsan VS Code'u da kapat-aç.
3. Kontrol et:
   ```powershell
   node -v      # v18.18 veya üstü (v20 önerilir)
   npm -v
   ```
4. `npm : ... running scripts is disabled on this system` hatası alırsan (npm.ps1 engellenmiş):
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
   ya da geçici olarak `npm.cmd install` / `npm.cmd run dev` yaz.
5. Hâlâ tanınmıyorsa PATH'te `C:\Program Files\nodejs\` olup olmadığına bak: `where.exe node`.

## 2) Çalıştırma

```powershell
cd hagy-the-unknown
npm install
npm run dev
```
Tarayıcıda http://localhost:3000 aç.

Telefonda denemek için (aynı Wi-Fi):
```powershell
npm run dev:lan
```
Sonra telefonda `http://BILGISAYAR_IP:3000` aç (IP için `ipconfig`). Not: bazı mobil tarayıcılar ses/tam ekran için HTTPS ister; Vercel'de bu sorun olmaz.

Üretim derlemesi: `npm run build` ve `npm run start`. Tip kontrolü: `npm run typecheck`.

## 3) GitHub + Vercel

```powershell
git init
git add .
git commit -m "HAGY: THE UNKNOWN - ilk surum"
git branch -M main
git remote add origin https://github.com/KULLANICI/hagy-the-unknown.git
git push -u origin main
```
Vercel → **Add New → Project** → GitHub reposunu seç → Framework otomatik **Next.js** → **Deploy**. Ortam değişkeni gerekmez.

## 4) Kontroller

| | Masaüstü | Mobil |
|---|---|---|
| Hareket | WASD / ok tuşları | Sol joystick |
| Bakış | Fare (tıkla → kilitlenir) | Sağ yarıyı kaydır |
| Koş | Shift | KOŞ (basılı tut) |
| El feneri | F | FENER |
| Etkileşim | E | EYLEM (jeneratör yanındayken çıkar) |
| Duraklat | Esc / P | Sağ üst "II" |

Sigortalar yaklaşınca otomatik toplanır.

## 5) Mevcut durum (dürüst liste)

Çalışan özellikler: menü, kalite seçimi (düşük/yüksek), duraklatma, 1. şahıs kamera, duvar çarpışması, el feneri (SpotLight), koşma + dayanıklılık, titreyen lambalar, sis, yaratık AI (devriye → kovalama → arama, BFS yol bulma, ses duyma, görüş hattı), 3 sigorta + jeneratör + çıkış, ani karartma/korkutma sahnesi, yakalanınca jumpscare, kazanma/kaybetme/yeniden başlatma, prosedürel ses (ortam, kalp atışı, ayak sesi, kovalama müziği, jeneratör uğultusu).

Sınırlar: modeller basit geometriden oluşur (gerçek 3D model dosyası yok); tek harita; kayıt sistemi yok; yaratık gizlenmeyi/dolap içinde saklanmayı desteklemez.

## 6) Dengeleme / görünüm ayarı

`game/config.ts`: hızlar, dayanıklılık, yaratık algı mesafeleri, `ambient`, `fogDensity`, `flashIntensity`. Sahne çok karanlık/aydınlık gelirse buradan değiştir. Harita: `game/map.ts` (metin tabanlı, düzenlemesi kolay).

## 7) Dosya yapısı

```
app/            layout, page, global CSS
components/     Game (Canvas + girdi), Ui (menü/HUD/dokunmatik), GameLoader (ssr:false)
game/           map, store, shared, audio, textures, World, Player, Enemy, Pickups, Scene, config
```
