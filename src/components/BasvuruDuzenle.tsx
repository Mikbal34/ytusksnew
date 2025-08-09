import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../contexts/AlertContext';
import { useBasvuru } from '../contexts/BasvuruContext';
import { useEtkinlik } from '../contexts/EtkinlikContext';
import { useAuth } from '../contexts/AuthContext';

const BasvuruDuzenle: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { basvuruId, etkinlik, etkinlikYeri, belgeler } = useBasvuru();
  const { etkinlikBelgeYukle } = useEtkinlik();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Upload new files
      const belgePromises = belgeler
        .filter(b => b.dosya instanceof File)
        .map(async (belge) => {
          const belgeUpload: EtkinlikBelgeUpload = {
            dosya: belge.dosya as File,
            dosyaAdi: belge.dosyaAdi,
            tip: belge.tip,
            basvuruId: basvuruId
          };
          
          try {
            const dosyaYolu = await etkinlikBelgeYukle(belgeUpload);
            if (dosyaYolu) {
              return {
                ...belge,
                dosya: dosyaYolu
              };
            }
            return belge;
          } catch (error) {
            console.error('Belge yükleme hatası:', error);
            throw error;
          }
        });
      
      const uploadedBelgeler = await Promise.all(belgePromises);
      
      // Combine uploaded files with existing string files
      const allBelgeler = [
        ...belgeler.filter(b => typeof b.dosya === 'string'),
        ...uploadedBelgeler
      ];
      
      // Prepare the updated etkinlik object
      const updatedEtkinlik: EtkinlikBasvuru = {
        ...etkinlik,
        etkinlikAdi,
        etkinlikYeri: {
          fakulte: etkinlikYeri.fakulte,
          detay: etkinlikYeri.detay
        },
        baslangicTarihi,
        bitisTarihi,
        aciklama,
        sponsorlar,
        konusmacilar,
        belgeler: allBelgeler,
        durum: 'Beklemede', // Revize edildiğinde durumu her zaman 'Beklemede' olarak ayarla
        danismanOnay: null, // Danışman onayını null olarak açıkça ayarla
        sksOnay: null, // SKS onayını null olarak açıkça ayarla
      };
      
      console.log('Güncellenecek etkinlik:', updatedEtkinlik);
      
      // Update the etkinlik
      await updateBasvuru(updatedEtkinlik);
      
      showAlert('Başvuru başarıyla güncellendi', 'success');
      
      // Redirect back
      setTimeout(() => {
        navigate('/kulup-paneli');
      }, 2000);
      
    } catch (error) {
      console.error('Başvuru güncellenirken hata oluştu:', error);
      showAlert('Başvuru güncellenirken bir hata oluştu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Form content */}
    </div>
  );
};

export default BasvuruDuzenle; 