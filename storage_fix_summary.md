# Etkinlik Belgeleri Depolama Sorunu Çözümü

## Yapılan Değişiklikler

1. **Depolama Yapısını Yeniden Düzenleme**:
   - `etkinlikBelgeYukle` fonksiyonu güncellendi
   - Dosyalar artık aşağıdaki hiyerarşik yapıda depolanıyor:
     ```
     etkinlik-belgeleri/
       └── {kulup_id}/
             └── {basvuru_id}/
                   └── {belge_tipi}/
                         └── {timestamp}_{dosya_adi}
     ```
   - Bu değişiklik her kulübün belgelerini ayrı klasörlerde saklamayı sağlar.

2. **Bucket Oluşturma Mekanizması**:
   - `etkinlik-belgeleri` bucket'ının yoksa otomatik olarak oluşturulması sağlandı
   - Bucket oluşturma işlemi için `supabaseAdmin` client kullanılarak yetki sorunları giderildi
   - Bucket özellikleri: private, 10MB dosya boyutu limiti, PDF dosyaları için kısıtlama

3. **İlgili Fonksiyonları Güncelleme**:
   - `etkinlikBelgeIndir` fonksiyonu güncellendi - yeni klasör yapısıyla uyumlu hale getirildi
   - `etkinlikBelgeSil` fonksiyonu güncellendi - doğru path kontrolü ve daha iyi hata mesajları eklendi

4. **Güvenlik Politikaları**:
   - `storage_bucket_policies.sql` dosyası oluşturuldu
   - SQL komutları ile bucket için RLS politikaları tanımlandı:
     - Kulüp başkanları sadece kendi kulüplerinin belgelerine erişebilir
     - Danışmanlar kendi kulüplerinin belgelerini görüntüleyebilir
     - SKS yöneticileri tüm belgelere erişebilir

5. **Dokümantasyon**:
   - `storage_organization_README.md` dosyası oluşturuldu
   - Depolama yapısı, kurulum adımları ve sorun giderme talimatları eklendi

## Kurulum Adımları

1. Kodu güncelleyin
2. Supabase Dashboard'a giriş yapın
3. SQL Editor'da `sql/storage_bucket_policies.sql` dosyasını çalıştırın
4. Uygulamayı test edin - belgeler artık kulüp ID'si ve etkinlik ID'sine göre ayrı klasörlerde saklanacak

## İleriye Dönük İyileştirmeler

1. Bucket varlığını kontrol etmek ve oluşturmak için admin API endpoint'i oluşturulabilir
2. Dosya yükleme sırasında ilerleme göstergeleri eklenebilir
3. Yüklenen belgelerin ön izlemeleri gösterilebilir
4. Daha detaylı hata işleme ve kullanıcı bildirimleri eklenebilir 