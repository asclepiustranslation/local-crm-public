# Asclepius CRM — Kurulum ve Yayınlama Rehberi

> **Proje:** Serbest çevirmenler için geliştirilmiş, React + Vite tabanlı tek sayfalık CRM uygulaması.  
> **Kaynak:** [github.com/asclepiustranslation/local-crm-public](https://github.com/asclepiustranslation/local-crm-public)  
> **Yayın platformu:** Vercel Hobby (ücretsiz plan)

---

## İçindekiler

1. [Gereksinimler](#1-gereksinimler)
2. [Repoyu Klonlama](#2-repoyu-klonlama)
3. [Bağımlılıkları Yükleme](#3-bağımlılıkları-yükleme)
4. [Google OAuth Kurulumu](#4-google-oauth-kurulumu)
5. [Ortam Değişkenleri (.env)](#5-ortam-değişkenleri-env)
6. [Yerel Geliştirme Sunucusu](#6-yerel-geliştirme-sunucusu)
7. [Vercel'e Yayınlama](#7-vcerele-yayınlama)
8. [Vercel Ortam Değişkenleri](#8-vercel-ortam-değişkenleri)
9. [Güncelleme ve Yeniden Yayınlama](#9-güncelleme-ve-yeniden-yayınlama)
10. [Katkı Rehberi](#10-katkı-rehberi)
11. [Sık Karşılaşılan Sorunlar](#11-sık-karşılaşılan-sorunlar)

---

## 1. Gereksinimler

## 1A. Windows Notu

Bu rehberdeki terminal komutları Linux/macOS tarzı kabuk yapısına göre yazılmıştır. Windows kullanıyorsanız aşağıdaki iki yöntemden biri önerilir:

- **WSL (Windows Subsystem for Linux):** En sorunsuz yöntemdir. Ubuntu gibi bir Linux dağıtımı kurup komutları rehberde yazdığı gibi çalıştırabilirsiniz.
- **Git Bash:** Temel `git`, `npm`, `node` ve klasör komutları için çoğu durumda yeterlidir.

### Windows kullanıcıları için kısa öneriler

1. Node.js'i resmi kurulum paketiyle yükleyin: [nodejs.org](https://nodejs.org/)
2. Git'i yükleyin ve mümkünse **Git Bash** ile çalışın: [git-scm.com](https://git-scm.com/)
3. Daha stabil bir geliştirme ortamı istiyorsanız **WSL + Ubuntu** tercih edin.
4. PowerShell kullanıyorsanız bazı komutlar farklı olabilir; örneğin `rm -rf` yerine `Remove-Item -Recurse -Force` gerekir.

> **Öneri:** Teknik olarak bu proje Windows'ta da çalışır; ancak rehberdeki komutları bire bir takip etmek için WSL veya Git Bash kullanmak daha pratiktir.

---


Sisteminizde aşağıdakilerin kurulu olması gerekir:

| Araç | Minimum Sürüm | Kontrol |
|------|--------------|---------|
| [Node.js](https://nodejs.org/) | v18.x | `node -v` |
| npm | v9.x (Node ile birlikte gelir) | `npm -v` |
| [Git](https://git-scm.com/) | Herhangi bir güncel sürüm | `git --version` |
| Vercel hesabı | — | [vercel.com](https://vercel.com) (GitHub ile giriş önerilir) |

> **Not:** Node.js ve npm'yi [nodejs.org](https://nodejs.org/en/download) adresinden indirebilirsiniz. LTS sürümü önerilir.

---

## 2. Repoyu Klonlama

Terminali açın ve projeyi yerel makinenize indirin:

```bash
git clone https://github.com/asclepiustranslation/local-crm-public.git
cd local-crm-public
```

> Eğer kendi fork'unuz varsa URL'yi kendi kullanıcı adınızla değiştirin:
> `git clone https://github.com/KULLANICI_ADINIZ/local-crm-public.git`

---

## 3. Bağımlılıkları Yükleme

Proje klasörünün içinde aşağıdaki komutu çalıştırın:

```bash
npm install
```

Bu komut `package.json` dosyasındaki tüm bağımlılıkları (`react`, `recharts`, `@react-oauth/google` vb.) `node_modules/` klasörüne yükler.

**Yüklenen başlıca paketler:**

| Paket | Amaç |
|-------|------|
| `react` + `react-dom` | UI framework |
| `recharts` | Grafik ve istatistik görselleştirme |
| `@react-oauth/google` | Google ile oturum açma (OAuth 2.0) |
| `vite` | Geliştirme sunucusu ve build aracı |

---

## 4. Google OAuth Kurulumu

Bu CRM, Google hesabıyla oturum açma özelliği kullanmaktadır. Bunun çalışması için bir **Google OAuth Client ID** gereklidir.

### Adımlar

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin ve Google hesabınızla giriş yapın.
2. Üstten **Proje Seçin → Yeni Proje** oluşturun (örn. `asclepius-crm`).
3. Sol menüden **APIs & Services → OAuth consent screen** bölümüne gidin:
   - **User Type:** External
   - Uygulama adı, e-posta ve logo bilgilerini doldurun.
   - **Scopes** adımında `email` ve `profile` izinlerini ekleyin.
4. Sol menüden **Credentials → Create Credentials → OAuth 2.0 Client ID** seçin:
   - **Application type:** Web application
   - **Authorized JavaScript origins:**
     - Yerel geliştirme için: `http://localhost:5173`
     - Vercel yayın adresiniz: `https://YOUR-APP-NAME.vercel.app`
   - **Authorized redirect URIs:** (genellikle bu CRM için gerekli değil, boş bırakabilirsiniz)
5. **Create** tuşuna basın — size bir **Client ID** verilecektir. Bu değeri kopyalayın.

> **Güvenlik:** Client ID'nizi asla kaynak koduna doğrudan yazmayın. Bir sonraki adımda `.env` dosyasına ekleyeceğiz.

---

## 5. Ortam Değişkenleri (.env)

Proje kök klasöründe `.env` adında bir dosya oluşturun:

```bash
# Proje kök klasöründe (.gitignore bu dosyayı zaten hariç tutuyor)
touch .env
```

Dosyanın içine aşağıdaki satırı ekleyin:

```env
VITE_GOOGLE_CLIENT_ID=BURAYA_CLIENT_ID_YAZIYOR
```

`BURAYA_CLIENT_ID_YAZIYOR` yerine 4. adımda aldığınız Client ID'yi yapıştırın.

> **Neden `VITE_` öneki?** Vite, yalnızca `VITE_` ile başlayan ortam değişkenlerini tarayıcıya açar. Diğer değişkenler sunucu tarafında gizli kalır.

`.env` dosyası `.gitignore` içinde zaten listelenmiştir, bu nedenle GitHub'a yüklenmez.

---

## 6. Yerel Geliştirme Sunucusu

Aşağıdaki komutla geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Terminal size şu gibi bir çıktı verecektir:

```
  VITE v8.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Tarayıcınızda [http://localhost:5173](http://localhost:5173) adresine giderek uygulamayı test edebilirsiniz.

**Diğer komutlar:**

```bash
npm run build    # Üretim için dist/ klasörüne derler
npm run preview  # Derlenen sürümü yerel olarak önizler
npm run lint     # ESLint ile kod kalitesini kontrol eder
```

---

## 7. Vercel'e Yayınlama

### Yöntem A: Vercel CLI (Önerilen)

1. Vercel CLI'ı global olarak yükleyin:
   ```bash
   npm install -g vercel
   ```

2. Giriş yapın:
   ```bash
   vercel login
   ```
   Açılan tarayıcıda GitHub hesabınızla oturum açın.

3. Proje klasöründeyken yayınlayın:
   ```bash
   vercel
   ```
   CLI size birkaç soru soracaktır:
   - **Set up and deploy?** → `Y`
   - **Which scope?** → Kendi hesabınızı seçin
   - **Link to existing project?** → `N` (ilk kurulumda)
   - **Project name?** → `local-crm-public` veya istediğiniz isim
   - **In which directory is your code located?** → `./` (Enter'a basın)
   - **Build command, output directory?** → Vite otomatik algılanır, onaylayın

4. Üretim yayını için:
   ```bash
   vercel --prod
   ```

### Yöntem B: Vercel Dashboard (Görsel Arayüz)

1. [vercel.com/new](https://vercel.com/new) adresine gidin.
2. **Import Git Repository** seçeneği altında GitHub hesabınızı bağlayın.
3. `local-crm-public` reposunu bulun ve **Import** butonuna tıklayın.
4. **Configure Project** ekranında:
   - **Framework Preset:** Vite (otomatik algılanmalı)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. **Deploy** butonuna tıklayın.

---

## 8. Vercel Ortam Değişkenleri

Yerel `.env` dosyası Vercel'e yüklenmez; değişkenleri ayrıca tanımlamanız gerekir.

1. Vercel Dashboard'da projenizi açın.
2. **Settings → Environment Variables** bölümüne gidin.
3. Aşağıdaki değişkeni ekleyin:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | Production, Preview, Development |

4. Değişkeni ekledikten sonra projeyi **yeniden yayınlayın** (Deployments sekmesinden son deploy'a sağ tıklayıp "Redeploy").

> **Önemli:** Google Cloud Console'da **Authorized JavaScript origins** listesine Vercel URL'nizi eklemeyi unutmayın (ör. `https://local-crm-public.vercel.app`).

---

## 9. Güncelleme ve Yeniden Yayınlama

Vercel, `main` branch'e her `git push` yaptığınızda **otomatik olarak** yeni bir deploy başlatır (Vercel Dashboard'dan bağlantı kurulduysa).

```bash
# Değişikliklerinizi yapın
git add .
git commit -m "feat: yeni özellik açıklaması"
git push origin main
```

Vercel birkaç dakika içinde yeni sürümü yayınlar. Dashboard'dan deploy durumunu takip edebilirsiniz.

---

## 10. Katkı Rehberi

Bu proje, topluluk katkısına açık hale getirilmiştir. Katkıda bulunmak için:

1. **Repoyu fork'layın:** GitHub'da sağ üst köşeden **Fork** butonuna tıklayın.
2. **Yeni branch açın:**
   ```bash
   git checkout -b feature/ozellik-adi
   ```
3. **Değişikliklerinizi yapın** ve commit'leyin:
   ```bash
   git commit -m "feat: kısa ve açıklayıcı mesaj"
   ```
   > Commit mesajları için önerilen format: `feat:`, `fix:`, `docs:`, `refactor:` önekleri.
4. **Fork'unuza push'layın:**
   ```bash
   git push origin feature/ozellik-adi
   ```
5. **Pull Request (PR) açın:** GitHub'da `local-crm-public` ana reposuna doğru PR oluşturun. PR açıklamasında ne değiştirdiğinizi ve neden değiştirdiğinizi belirtin.

### Katkı Kuralları

- Mevcut kod stilini koruyun (ESLint kuralları projeye dahildir).
- PR açmadan önce `npm run lint` komutunu çalıştırın.
- Büyük değişiklikler için önce bir **Issue** açarak tartışmaya başlamanız önerilir.
- Hassas bilgiler (API anahtarı, Client ID vb.) kesinlikle kaynak koda eklenmemelidir.

---

## 11. Sık Karşılaşılan Sorunlar

### `npm install` hata veriyor
- Node.js sürümünüzün v18 veya üzeri olduğundan emin olun (`node -v`).
- `node_modules/` klasörünü ve `package-lock.json` dosyasını silip tekrar deneyin:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### Google ile giriş çalışmıyor (localhost)
- `.env` dosyasında `VITE_` önekinin tam olarak yazıldığını kontrol edin.
- Google Cloud Console'da `http://localhost:5173` adresinin **Authorized JavaScript origins** listesinde olduğundan emin olun.
- Değişiklik yaptıktan sonra geliştirme sunucusunu yeniden başlatın (`Ctrl+C` → `npm run dev`).

### Vercel'de Google girişi çalışmıyor
- Vercel URL'nizi (`https://your-app.vercel.app`) Google Cloud Console'daki Authorized origins listesine ekleyin.
- Vercel ortam değişkenlerinde `VITE_GOOGLE_CLIENT_ID`'nin doğru girildiğini kontrol edin.
- Değişiklikten sonra Vercel'de yeni bir deploy başlatın.

### Build hatası: `vite: command not found`
- `npm install` komutunu tekrar çalıştırın.
- Global yerine local Vite kullandığınızdan emin olun: `npx vite build`.

### Vercel deploy başarısız oluyor
- Vercel Dashboard'da hatalı deploy'un loglarını inceleyin.
- Build komutu `npm run build`, çıktı klasörü `dist` olarak ayarlandığından emin olun.

---

> **Sorularınız için** GitHub Issues bölümünü kullanabilirsiniz:  
> [github.com/asclepiustranslation/local-crm-public/issues](https://github.com/asclepiustranslation/local-crm-public/issues)
