import React, { useMemo } from 'react';
import { OnayDurumu } from '../types';
import { formatDate } from '../utils/date';

interface OnayGecmisiProps {
  danismanOnaylari: OnayDurumu[];
  sksOnaylari: OnayDurumu[];
}

export function OnayGecmisi({ danismanOnaylari, sksOnaylari }: OnayGecmisiProps) {
  // Tekrarlanan onayları filtrele - aynı tarih ve duruma sahip onaylardan sadece bir tanesi gösterilsin
  const filtrelenmisOnaylar = useMemo(() => {
    const filtrele = (onaylar: OnayDurumu[]) => {
      const benzersizOnaylar = new Map<string, OnayDurumu>();
      
      // Onayları tarihe göre sırala (en yeni en üstte)
      const siraliOnaylar = [...onaylar].sort((a, b) => {
        return new Date(b.tarih).getTime() - new Date(a.tarih).getTime();
      });
      
      // Her bir onay için tarih+durum+redSebep kombinasyonu benzersiz bir anahtar oluştur
      siraliOnaylar.forEach((onay) => {
        const anahtar = `${onay.tarih}_${onay.durum}_${onay.redSebebi || ''}`;
        if (!benzersizOnaylar.has(anahtar)) {
          benzersizOnaylar.set(anahtar, onay);
        }
      });
      
      // Map'ten değerleri dizi olarak döndür
      return Array.from(benzersizOnaylar.values());
    };
    
    return {
      danisman: filtrele(danismanOnaylari),
      sks: filtrele(sksOnaylari)
    };
  }, [danismanOnaylari, sksOnaylari]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Danışman Onay Geçmişi</h3>
        {filtrelenmisOnaylar.danisman.length > 0 ? (
          <div className="space-y-2">
            {filtrelenmisOnaylar.danisman.map((onay, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className={`font-medium ${
                  onay.durum === 'Onaylandı' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {onay.durum}
                </div>
                <div className="text-sm text-gray-600">
                  Tarih: {formatDate(onay.tarih)}
                </div>
                {onay.redSebebi && (
                  <div className="text-sm text-gray-600 mt-1">
                    Red Sebebi: {onay.redSebebi}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">Henüz onay geçmişi bulunmuyor.</div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">SKS Onay Geçmişi</h3>
        {filtrelenmisOnaylar.sks.length > 0 ? (
          <div className="space-y-2">
            {filtrelenmisOnaylar.sks.map((onay, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className={`font-medium ${
                  onay.durum === 'Onaylandı' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {onay.durum}
                </div>
                <div className="text-sm text-gray-600">
                  Tarih: {formatDate(onay.tarih)}
                </div>
                {onay.redSebebi && (
                  <div className="text-sm text-gray-600 mt-1">
                    Red Sebebi: {onay.redSebebi}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">Henüz onay geçmişi bulunmuyor.</div>
        )}
      </div>
    </div>
  );
}