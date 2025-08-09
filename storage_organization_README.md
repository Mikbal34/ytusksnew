# Etkinlik Belgeleri Depolama Yapısı

## Genel Bakış

Etkinlik belgelerini Supabase Storage'da organize bir şekilde saklamak için aşağıdaki klasör yapısı uygulanmıştır:

```
etkinlik-belgeleri/
  ├── {kulup_id}/
  │     ├── {basvuru_id}/
  │     │     ├── {belge_tipi}/
  │     │     │     ├── {timestamp}_{dosya_adi}
  │     │     │     └── ...
  │     │     └── ...
  │     └── ...
  └── ...
```

Bu yapı sayesinde:
- Her kulübün belgeleri ayrı bir klasörde tutulur
- Her etkinlik başvurusu kendi kulübünün klasörü altında bulunur
- Her belge türü (afiş, katılımcı listesi vb.) kendi klasöründe organize edilir
- Dosya adlarına benzersiz olmaları için zaman damgası eklenir

## Kurulum Adımları

1. Supabase Dashboard'a giriş yapın
2. Storage sayfasına gidin
3. "New Bucket" butonuna tıklayarak yeni bir bucket oluşturun:
   - Bucket adı: `etkinlik-belgeleri`
   - Public: Hayır (işaretsiz bırakın)
   - File size limit: 10 MB
   - Allowed MIME Types: application/pdf

4. Bucket oluşturulduktan sonra, RLS (Row Level Security) politikalarını ayarlamak için SQL Editor'e gidin ve `sql/storage_bucket_policies.sql` dosyasındaki SQL komutlarını çalıştırın.

## Güvenlik Politikaları

Oluşturulan RLS politikaları şunları sağlar:

1. Kimlik doğrulaması yapılmış tüm kullanıcılar dosyaları görüntüleyebilir
2. Kulüp başkanları yalnızca kendi kulüplerine ait dosyaları yükleyebilir, güncelleyebilir ve silebilir
3. Akademik danışmanlar sorumlu oldukları kulüplere ait dosyaları görüntüleyebilir
4. SKS yöneticileri tüm dosyalara tam erişime sahiptir

## Sorun Giderme

Eğer belge yükleme işlemlerinde hata alırsanız:

1. Tarayıcı konsolunda hata mesajlarını kontrol edin
2. Supabase Dashboard'da Storage > Policies kısmından tüm politikaların doğru şekilde oluşturulduğunu doğrulayın
3. Storage > etkinlik-belgeleri bucket'ını açarak bucket'ın düzgün oluşturulduğunu kontrol edin
4. Mevcut kullanıcının (kulüp başkanı) doğru kulüple ilişkilendirildiğinden emin olun 