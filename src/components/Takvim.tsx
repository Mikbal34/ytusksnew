import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { EtkinlikBasvuru } from '../types';
import { Calendar, X, FileText, Download } from 'lucide-react';
import { etkinlikBelgeIndir } from '../utils/supabaseStorage';

interface TakvimProps {
  onaylananEtkinlikler: EtkinlikBasvuru[];
}

export function Takvim({ onaylananEtkinlikler }: TakvimProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<EtkinlikBasvuru[]>([]);
  const [selectedEventForDocs, setSelectedEventForDocs] = useState<EtkinlikBasvuru | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEtkinliklerForDate = (date: Date) => {
    return onaylananEtkinlikler.filter(etkinlik => {
      try {
        // Önce zaman dilimlerini kontrol et
        if (etkinlik.zamanDilimleri && etkinlik.zamanDilimleri.length > 0) {
          return etkinlik.zamanDilimleri.some(zaman => {
            if (!zaman.baslangic) return false;
            const etkinlikTarihi = parseISO(zaman.baslangic);
            return isSameDay(etkinlikTarihi, date);
          });
        }
        // Fallback olarak eski tarih alanlarını kullan
        if (!etkinlik.baslangicTarihi) return false;
        const etkinlikTarihi = parseISO(etkinlik.baslangicTarihi);
        return isSameDay(etkinlikTarihi, date);
      } catch (error) {
        console.error('Invalid date format:', etkinlik.zamanDilimleri || etkinlik.baslangicTarihi);
        return false;
      }
    });
  };

  const handleDateClick = (date: Date, events: EtkinlikBasvuru[]) => {
    if (events.length > 0) {
      setSelectedDate(date);
      setSelectedEvents(events);
      setShowModal(true);
    }
  };

  const handleBelgeIndir = async (dosya: string, dosyaAdi: string) => {
    try {
      const downloadUrl = await etkinlikBelgeIndir(dosya);
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = dosyaAdi;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Belge indirilemedi. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('Belge indirme hatası:', error);
      alert('Belge indirme işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const handleShowDocuments = (event: EtkinlikBasvuru) => {
    setSelectedEventForDocs(event);
    setShowDocuments(true);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Etkinlik Takvimi
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <span className="font-medium">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}

          {days.map((day) => {
            const etkinlikler = getEtkinliklerForDate(day);
            const hasEtkinlik = etkinlikler.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isHovered = hoveredDate && isSameDay(day, hoveredDate);

            return (
              <div
                key={day.toString()}
                className={`
                  relative p-2 min-h-[80px] border rounded-lg transition-all
                  ${!isSameMonth(day, currentDate) ? 'bg-gray-50' : 'bg-white'}
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  ${hasEtkinlik ? 'cursor-pointer hover:bg-blue-50' : ''}
                `}
                onClick={() => handleDateClick(day, etkinlikler)}
                onMouseEnter={() => hasEtkinlik && setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <span className={`text-sm ${!isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </span>
                
                {hasEtkinlik && (
                  <div className="mt-1">
                    {etkinlikler.map((etkinlik) => (
                      <div
                        key={etkinlik.id}
                        className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 mb-1 truncate"
                      >
                        {etkinlik.etkinlikAdi}
                      </div>
                    ))}
                  </div>
                )}

                {isHovered && hasEtkinlik && (
                  <div className="absolute z-10 left-full top-0 ml-2 w-64 p-3 bg-white rounded-lg shadow-lg border">
                    <h4 className="font-medium text-gray-800 mb-2">
                      {format(day, 'd MMMM yyyy', { locale: tr })}
                    </h4>
                    <div className="space-y-2">
                      {etkinlikler.map((etkinlik) => (
                        <div key={etkinlik.id} className="text-sm">
                          <div className="font-medium text-gray-800">{etkinlik.etkinlikAdi}</div>
                          <div className="text-gray-600">{etkinlik.kulupAdi}</div>
                          <div className="text-gray-500 text-xs">
                            {etkinlik.etkinlikYeri?.fakulte} {etkinlik.etkinlikYeri?.detay}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <h3 className="text-xl font-semibold text-gray-800">
                {format(selectedDate, 'd MMMM yyyy', { locale: tr })} Etkinlikleri
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedEvents.map((etkinlik) => (
                <div key={etkinlik.id} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {etkinlik.etkinlikAdi}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Kulüp: </span>
                      <span className="text-gray-800">{etkinlik.kulupAdi}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Tarih: </span>
                      <span className="text-gray-800">
                        {etkinlik.zamanDilimleri && etkinlik.zamanDilimleri.length > 0 
                          ? etkinlik.zamanDilimleri.map((zaman, index) => (
                              <div key={index}>
                                {format(parseISO(zaman.baslangic), 'dd.MM.yyyy HH:mm', { locale: tr })}
                                {zaman.bitis && ` - ${format(parseISO(zaman.bitis), 'HH:mm', { locale: tr })}`}
                              </div>
                            ))
                          : etkinlik.baslangicTarihi 
                            ? format(parseISO(etkinlik.baslangicTarihi), 'dd.MM.yyyy HH:mm', { locale: tr })
                            : 'Tarih belirtilmemiş'
                        }
                      </span>
                    </div>
                    {etkinlik.etkinlikYeri && (
                      <div>
                        <span className="font-medium text-gray-600">Yer: </span>
                        <span className="text-gray-800">
                          {etkinlik.etkinlikYeri.fakulte}
                          {etkinlik.etkinlikYeri.detay && ` - ${etkinlik.etkinlikYeri.detay}`}
                        </span>
                      </div>
                    )}
                    {etkinlik.belgeler && etkinlik.belgeler.length > 0 && (
                      <button
                        onClick={() => handleShowDocuments(etkinlik)}
                        className="mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-700"
                      >
                        <FileText className="w-4 h-4" />
                        Etkinlik Belgelerini Görüntüle
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDocuments && selectedEventForDocs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
              <h3 className="text-xl font-semibold text-gray-800">
                {selectedEventForDocs.etkinlikAdi} - Belgeler
              </h3>
              <button
                onClick={() => {
                  setShowDocuments(false);
                  setSelectedEventForDocs(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedEventForDocs.belgeler?.map((belge, index) => (
                <button
                  key={index}
                  onClick={() => handleBelgeIndir(belge.dosya, belge.dosyaAdi)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-900">{belge.tip}</span>
                  <Download className="w-5 h-5 text-gray-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}