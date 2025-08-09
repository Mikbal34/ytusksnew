import { jsPDF } from 'jspdf';
import { EtkinlikBasvuru } from '../types';

export const generatePDF = (basvuru: EtkinlikBasvuru) => {
  // Create PDF with UTF-8 encoding
  const doc = new jsPDF('p', 'pt', 'a4');
  
  // Enable UTF-8 support
  doc.setLanguage("tr");
  
  // Page settings
  const pageWidth = doc.internal.pageSize.width;
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  let y = 40;
  const lineHeight = 20;

  // Helper function to add text with line breaks
  const addText = (text: string, indent: number = 0) => {
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    doc.text(lines, margin + indent, y);
    y += lineHeight * lines.length;
  };

  // Helper function to add section with table-like formatting
  const addTableRow = (label: string, value: string) => {
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 15, contentWidth, lineHeight + 8, 'F');
    doc.text(label, margin + 5, y);
    doc.text(value, margin + 150, y);
    y += lineHeight + 5;
  };

  // Title
  doc.setFontSize(16);
  doc.text('ETKİNLİK KULÜP BAŞVURU FORMU', margin, y);
  y += 30;

  // Basic Info
  doc.setFontSize(11);
  doc.setDrawColor(200, 200, 200);

  // Add table header
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y - 15, contentWidth, lineHeight + 8, 'F');
  doc.text('BAŞVURU BİLGİLERİ', margin + 5, y);
  y += lineHeight + 10;

  // Add table rows
  addTableRow('Kulüp Adı:', basvuru.kulupAdi);
  addTableRow('Etkinlik Adı:', basvuru.etkinlikAdi);
  addTableRow('Etkinlik Yeri:', `${basvuru.etkinlikYeri.fakulte} - ${basvuru.etkinlikYeri.detay}`);
  addTableRow('Başlangıç:', new Date(basvuru.baslangicTarihi).toLocaleString('tr-TR'));
  addTableRow('Bitiş:', new Date(basvuru.bitisTarihi).toLocaleString('tr-TR'));

  y += 10;

  // Sponsors section
  if (basvuru.sponsorlar && basvuru.sponsorlar.length > 0) {
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y - 15, contentWidth, lineHeight + 8, 'F');
    doc.text('SPONSORLAR', margin + 5, y);
    y += lineHeight + 10;

    basvuru.sponsorlar.forEach((sponsor, index) => {
      addTableRow(`Sponsor ${index + 1}:`, `${sponsor.firmaAdi} - ${sponsor.detay}`);
    });
    y += 10;
  }

  // Speakers section
  if (basvuru.konusmacilar && basvuru.konusmacilar.length > 0) {
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y - 15, contentWidth, lineHeight + 8, 'F');
    doc.text('KONUŞMACILAR', margin + 5, y);
    y += lineHeight + 10;

    basvuru.konusmacilar.forEach((konusmaci, index) => {
      addTableRow(`Konuşmacı ${index + 1}:`, konusmaci.adSoyad);
      addTableRow('Özgeçmiş:', konusmaci.ozgecmis);
      if (konusmaci.aciklama) {
        addTableRow('Açıklama:', konusmaci.aciklama);
      }
      y += 5;
    });
  }

  // Description section
  y += 10;
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y - 15, contentWidth, lineHeight + 8, 'F');
  doc.text('ETKİNLİK AÇIKLAMASI', margin + 5, y);
  y += lineHeight + 10;
  const descriptionLines = doc.splitTextToSize(basvuru.aciklama, contentWidth - 10);
  doc.text(descriptionLines, margin + 5, y);
  y += (lineHeight * descriptionLines.length) + 20;

  // Approval Status
  if (basvuru.danismanOnay || basvuru.sksOnay) {
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y - 15, contentWidth, lineHeight + 8, 'F');
    doc.text('ONAY BİLGİLERİ', margin + 5, y);
    y += lineHeight + 10;

    if (basvuru.danismanOnay) {
      addTableRow('Danışman Onayı:', basvuru.danismanOnay.durum);
      addTableRow('Onay Tarihi:', new Date(basvuru.danismanOnay.tarih).toLocaleString('tr-TR'));
      if (basvuru.danismanOnay.redSebebi) {
        addTableRow('Red Sebebi:', basvuru.danismanOnay.redSebebi);
      }
    }

    if (basvuru.sksOnay) {
      y += 5;
      addTableRow('SKS Onayı:', basvuru.sksOnay.durum);
      addTableRow('Onay Tarihi:', new Date(basvuru.sksOnay.tarih).toLocaleString('tr-TR'));
      if (basvuru.sksOnay.redSebebi) {
        addTableRow('Red Sebebi:', basvuru.sksOnay.redSebebi);
      }
    }
  }

  // Save with proper Turkish character support in filename
  const filename = basvuru.etkinlikAdi
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  doc.save(`${filename}-basvuru.pdf`);
};