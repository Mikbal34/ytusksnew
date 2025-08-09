import { EtkinlikBasvuru } from '../types';
import { supabase } from './supabase';

// Email gönderiminin etkinleştirilip etkinleştirilmediğini kontrol et
const isEmailEnabled = import.meta.env.VITE_EMAIL_ENABLED === 'true';

// Email bilgileri için arayüz
interface EmailData {
  to: string;
  subject: string;
  html: string;
}

// Loglamak ve simule etmek için email gönderme fonksiyonu
export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  console.log('📧 EMAIL SERVİSİ - GÖNDERME SİMÜLASYONU');
  console.log(`📧 Alıcı: ${emailData.to}`);
  console.log(`📧 Konu: ${emailData.subject}`);
  console.log(`📧 İçerik: ${emailData.html.substring(0, 150)}...`);
  
  if (isEmailEnabled) {
    // Gerçek bir email gönderimi yapılabilir - burada sadece simüle ediliyor
    console.log('📧 Email gönderme aktif. Gerçek entegrasyon için bir sunucu gerekiyor.');
    
    // Eğer bir API endpoint'iniz varsa, email bilgilerini oraya gönderebilirsiniz:
    // örnek: await fetch('/api/send-email', { method: 'POST', body: JSON.stringify(emailData) });
    
    return true;
  } else {
    console.log('📧 Email gönderme devre dışı.');
    return true;
  }
};

// Get kulüp başkanı email from etkinlik
export const getKulupBaskanEmail = async (etkinlikId: string): Promise<string | null> => {
  try {
    // First, get the kulüp ID from the etkinlik
    const { data: etkinlikData, error: etkinlikError } = await supabase
      .from('etkinlik_basvurulari')
      .select('kulup_id')
      .eq('id', etkinlikId)
      .single();
    
    if (etkinlikError || !etkinlikData) {
      console.error('Error getting etkinlik data:', etkinlikError);
      return null;
    }
    
    // Get the kulüp başkanı email using the kulüp ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('kulup_id', etkinlikData.kulup_id)
      .eq('role', 'kulup_baskani')
      .single();
    
    if (profileError || !profileData) {
      console.error('Error getting kulüp başkanı email:', profileError);
      return null;
    }
    
    return profileData.email;
  } catch (error) {
    console.error('Error getting kulüp başkanı email:', error);
    return null;
  }
};

// Danışman email'ini getir
export const getDanismanEmail = async (etkinlikId: string): Promise<string | null> => {
  try {
    // Etkinlikten kulüp ID'sini al
    const { data: etkinlikData, error: etkinlikError } = await supabase
      .from('etkinlik_basvurulari')
      .select('kulup_id')
      .eq('id', etkinlikId)
      .single();
    
    if (etkinlikError || !etkinlikData) {
      console.error('Error getting etkinlik data:', etkinlikError);
      return null;
    }
    
    // Kulüp ID'si ile danışman ID'sini al - muhtemel sütun adları kullanılıyor
    // Önce tüm kulüp verilerini alalım
    const { data: kulupData, error: kulupError } = await supabase
      .from('kulupler')
      .select('*')  // Tüm sütunları seç
      .eq('id', etkinlikData.kulup_id)
      .single();
    
    if (kulupError || !kulupData) {
      console.error('Error getting kulüp data:', kulupError);
      return null;
    }
    
    // Kulüp verisini inceleyelim ve danismanId, akademik_danisman_id gibi adlar kontrol edelim
    console.log('Kulüp verisi:', kulupData);
    
    // Olası farklı sütun adları
    const danismanId = kulupData.danisman_id || kulupData.danismanId || kulupData.akademik_danisman_id;
    
    if (!danismanId) {
      console.error('Danışman ID bulunamadı. Kulüp verileri:', kulupData);
      return null;
    }
    
    // Danışman ID'si ile danışman email'ini al
    const { data: danismanData, error: danismanError } = await supabase
      .from('akademik_danismanlar')
      .select('eposta')
      .eq('id', danismanId)
      .single();
    
    if (danismanError || !danismanData) {
      console.error('Error getting danışman email:', danismanError);
      return null;
    }
    
    return danismanData.eposta;
  } catch (error) {
    console.error('Error getting danışman email:', error);
    return null;
  }
};

// Get SKS email addresses
export const getSksEmails = async (): Promise<string[]> => {
  try {
    // Get all SKS emails
    const { data: sksData, error: sksError } = await supabase
      .from('sks_kullanicilari')
      .select('eposta');
    
    if (sksError || !sksData) {
      console.error('Error getting SKS emails:', sksError);
      return [];
    }
    
    return sksData.map(user => user.eposta);
  } catch (error) {
    console.error('Error getting SKS emails:', error);
    return [];
  }
};

// Send notification for new event creation
export const sendEtkinlikBasvuruNotification = async (etkinlik: EtkinlikBasvuru): Promise<void> => {
  try {
    // Get emails
    const kulupBaskanEmail = await getKulupBaskanEmail(etkinlik.id);
    const danismanEmail = await getDanismanEmail(etkinlik.id);
    
    // Send email to kulüp başkanı
    if (kulupBaskanEmail) {
      await sendEmail({
        to: kulupBaskanEmail,
        subject: 'Etkinlik Başvurunuz Alındı',
        html: `
          <h1>Etkinlik Başvurunuz Alındı</h1>
          <p>Sayın Kulüp Başkanı,</p>
          <p>"${etkinlik.etkinlikAdi}" etkinliği için başvurunuz başarıyla alınmıştır. Başvurunuz şu anda danışman onayı beklemektedir.</p>
          <p>Etkinlik detayları:</p>
          <ul>
            <li>Etkinlik Adı: ${etkinlik.etkinlikAdi}</li>
            <li>Yer: ${etkinlik.etkinlikYeri.fakulte} - ${etkinlik.etkinlikYeri.detay}</li>
            <li>Başlangıç: ${new Date(etkinlik.baslangicTarihi).toLocaleString('tr-TR')}</li>
            <li>Bitiş: ${new Date(etkinlik.bitisTarihi).toLocaleString('tr-TR')}</li>
          </ul>
          <p>Etkinlik başvurunuzun durumunu SKS sisteminden takip edebilirsiniz.</p>
        `
      });
    }
    
    // Send email to akademik danışman
    if (danismanEmail) {
      await sendEmail({
        to: danismanEmail,
        subject: 'Yeni Etkinlik Başvurusu - Onay Bekliyor',
        html: `
          <h1>Yeni Etkinlik Başvurusu - Onay Bekliyor</h1>
          <p>Sayın Akademik Danışman,</p>
          <p>${etkinlik.kulupAdi} kulübü "${etkinlik.etkinlikAdi}" etkinliği için yeni bir başvuru oluşturdu. Bu etkinlik onayınızı beklemektedir.</p>
          <p>Etkinlik detayları:</p>
          <ul>
            <li>Etkinlik Adı: ${etkinlik.etkinlikAdi}</li>
            <li>Kulüp: ${etkinlik.kulupAdi}</li>
            <li>Yer: ${etkinlik.etkinlikYeri.fakulte} - ${etkinlik.etkinlikYeri.detay}</li>
            <li>Başlangıç: ${new Date(etkinlik.baslangicTarihi).toLocaleString('tr-TR')}</li>
            <li>Bitiş: ${new Date(etkinlik.bitisTarihi).toLocaleString('tr-TR')}</li>
          </ul>
          <p>Etkinlik başvurusunu onaylamak veya reddetmek için lütfen SKS sistemine giriş yapınız.</p>
        `
      });
    }
  } catch (error) {
    console.error('Error sending etkinlik başvuru notifications:', error);
  }
};

// Send notification for danışman approval
export const sendDanismanOnayNotification = async (etkinlik: EtkinlikBasvuru): Promise<void> => {
  try {
    // Get emails
    const kulupBaskanEmail = await getKulupBaskanEmail(etkinlik.id);
    const sksEmails = await getSksEmails();
    
    // Send email to kulüp başkanı
    if (kulupBaskanEmail) {
      await sendEmail({
        to: kulupBaskanEmail,
        subject: 'Etkinlik Başvurunuz Danışman Tarafından Onaylandı',
        html: `
          <h1>Etkinlik Başvurunuz Danışman Tarafından Onaylandı</h1>
          <p>Sayın Kulüp Başkanı,</p>
          <p>"${etkinlik.etkinlikAdi}" etkinliği için başvurunuz akademik danışmanınız tarafından onaylanmıştır. Başvurunuz şu anda SKS onayı beklemektedir.</p>
          <p>Etkinlik başvurunuzun durumunu SKS sisteminden takip edebilirsiniz.</p>
        `
      });
    }
    
    // Send email to SKS personeli
    if (sksEmails.length > 0) {
      await sendEmail({
        to: sksEmails.join(','),
        subject: 'Yeni Etkinlik Başvurusu - SKS Onayı Bekliyor',
        html: `
          <h1>Yeni Etkinlik Başvurusu - SKS Onayı Bekliyor</h1>
          <p>Sayın SKS Yetkilisi,</p>
          <p>${etkinlik.kulupAdi} kulübü tarafından oluşturulan "${etkinlik.etkinlikAdi}" etkinliği akademik danışman tarafından onaylanmış olup SKS onayını beklemektedir.</p>
          <p>Etkinlik detayları:</p>
          <ul>
            <li>Etkinlik Adı: ${etkinlik.etkinlikAdi}</li>
            <li>Kulüp: ${etkinlik.kulupAdi}</li>
            <li>Yer: ${etkinlik.etkinlikYeri.fakulte} - ${etkinlik.etkinlikYeri.detay}</li>
            <li>Başlangıç: ${new Date(etkinlik.baslangicTarihi).toLocaleString('tr-TR')}</li>
            <li>Bitiş: ${new Date(etkinlik.bitisTarihi).toLocaleString('tr-TR')}</li>
          </ul>
          <p>Etkinlik başvurusunu onaylamak veya reddetmek için lütfen SKS sistemine giriş yapınız.</p>
        `
      });
    }
  } catch (error) {
    console.error('Error sending danışman onay notifications:', error);
  }
};

// Send notification for danışman rejection
export const sendDanismanRedNotification = async (etkinlik: EtkinlikBasvuru, redSebebi?: string): Promise<void> => {
  try {
    // Get kulüp başkanı email
    const kulupBaskanEmail = await getKulupBaskanEmail(etkinlik.id);
    
    // Send email to kulüp başkanı
    if (kulupBaskanEmail) {
      await sendEmail({
        to: kulupBaskanEmail,
        subject: 'Etkinlik Başvurunuz Danışman Tarafından Reddedildi',
        html: `
          <h1>Etkinlik Başvurunuz Danışman Tarafından Reddedildi</h1>
          <p>Sayın Kulüp Başkanı,</p>
          <p>"${etkinlik.etkinlikAdi}" etkinliği için başvurunuz akademik danışmanınız tarafından reddedilmiştir.</p>
          ${redSebebi ? `<p><strong>Red Sebebi:</strong> ${redSebebi}</p>` : ''}
          <p>Etkinlik başvurunuzu düzenleyerek tekrar gönderebilirsiniz.</p>
        `
      });
    }
  } catch (error) {
    console.error('Error sending danışman red notification:', error);
  }
};

// Send notification for SKS approval
export const sendSksOnayNotification = async (etkinlik: EtkinlikBasvuru): Promise<void> => {
  try {
    // Get kulüp başkanı and danışman emails
    const kulupBaskanEmail = await getKulupBaskanEmail(etkinlik.id);
    const danismanEmail = await getDanismanEmail(etkinlik.id);
    
    // Send email to kulüp başkanı
    if (kulupBaskanEmail) {
      await sendEmail({
        to: kulupBaskanEmail,
        subject: 'Etkinlik Başvurunuz Onaylandı',
        html: `
          <h1>Etkinlik Başvurunuz Onaylandı</h1>
          <p>Sayın Kulüp Başkanı,</p>
          <p>"${etkinlik.etkinlikAdi}" etkinliği için başvurunuz SKS tarafından onaylanmıştır. Etkinliğiniz artık resmi olarak gerçekleştirilmeye hazırdır.</p>
          <p>Etkinlik detayları:</p>
          <ul>
            <li>Etkinlik Adı: ${etkinlik.etkinlikAdi}</li>
            <li>Yer: ${etkinlik.etkinlikYeri.fakulte} - ${etkinlik.etkinlikYeri.detay}</li>
            <li>Başlangıç: ${new Date(etkinlik.baslangicTarihi).toLocaleString('tr-TR')}</li>
            <li>Bitiş: ${new Date(etkinlik.bitisTarihi).toLocaleString('tr-TR')}</li>
          </ul>
        `
      });
    }
    
    // Send email to akademik danışman
    if (danismanEmail) {
      await sendEmail({
        to: danismanEmail,
        subject: 'Etkinlik Başvurusu Onaylandı',
        html: `
          <h1>Etkinlik Başvurusu Onaylandı</h1>
          <p>Sayın Akademik Danışman,</p>
          <p>${etkinlik.kulupAdi} kulübü tarafından oluşturulan "${etkinlik.etkinlikAdi}" etkinliği SKS tarafından onaylanmıştır.</p>
          <p>Etkinlik detayları:</p>
          <ul>
            <li>Etkinlik Adı: ${etkinlik.etkinlikAdi}</li>
            <li>Kulüp: ${etkinlik.kulupAdi}</li>
            <li>Yer: ${etkinlik.etkinlikYeri.fakulte} - ${etkinlik.etkinlikYeri.detay}</li>
            <li>Başlangıç: ${new Date(etkinlik.baslangicTarihi).toLocaleString('tr-TR')}</li>
            <li>Bitiş: ${new Date(etkinlik.bitisTarihi).toLocaleString('tr-TR')}</li>
          </ul>
        `
      });
    }
  } catch (error) {
    console.error('Error sending SKS onay notifications:', error);
  }
};

// Send notification for SKS rejection
export const sendSksRedNotification = async (etkinlik: EtkinlikBasvuru, redSebebi?: string): Promise<void> => {
  try {
    // Get kulüp başkanı and danışman emails
    const kulupBaskanEmail = await getKulupBaskanEmail(etkinlik.id);
    const danismanEmail = await getDanismanEmail(etkinlik.id);
    
    // Send email to kulüp başkanı
    if (kulupBaskanEmail) {
      await sendEmail({
        to: kulupBaskanEmail,
        subject: 'Etkinlik Başvurunuz SKS Tarafından Reddedildi',
        html: `
          <h1>Etkinlik Başvurunuz SKS Tarafından Reddedildi</h1>
          <p>Sayın Kulüp Başkanı,</p>
          <p>"${etkinlik.etkinlikAdi}" etkinliği için başvurunuz SKS tarafından reddedilmiştir.</p>
          ${redSebebi ? `<p><strong>Red Sebebi:</strong> ${redSebebi}</p>` : ''}
          <p>Etkinlik başvurunuzu düzenleyerek tekrar gönderebilirsiniz.</p>
        `
      });
    }
    
    // Send email to akademik danışman
    if (danismanEmail) {
      await sendEmail({
        to: danismanEmail,
        subject: 'Etkinlik Başvurusu SKS Tarafından Reddedildi',
        html: `
          <h1>Etkinlik Başvurusu SKS Tarafından Reddedildi</h1>
          <p>Sayın Akademik Danışman,</p>
          <p>${etkinlik.kulupAdi} kulübü tarafından oluşturulan "${etkinlik.etkinlikAdi}" etkinliği SKS tarafından reddedilmiştir.</p>
          ${redSebebi ? `<p><strong>Red Sebebi:</strong> ${redSebebi}</p>` : ''}
        `
      });
    }
  } catch (error) {
    console.error('Error sending SKS red notifications:', error);
  }
}; 