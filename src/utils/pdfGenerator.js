import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dữ liệu giá
const pricingData = {
    panels: {
        "AE_Solar_580W": { label: 'Tấm Pin AE Solar 580W Mono', price: 2850000, power: 580 },
        "AE_Solar_730W": { label: 'Tấm Pin AE Solar 730W Mono', price: 3250000, power: 730 },
        "TCL_Solar_620W": { label: 'Tấm Pin TCL Solar 620W', price: 2650000, power: 620 },
        "TCL_Solar_650W": { label: 'Tấm Pin TCL Solar 650W', price: 2780000, power: 650 }
    },
    inverters: {
        "LuxPower_SNA_5000W": { label: 'Inverter Hybrid LuxPower SNA 5000W', price: 15200000, power: 5 },
        "LuxPower_6.5PRO": { label: 'Inverter Hybrid LuxPower 6.5PRO', price: 19500000, power: 6.5 },
        "LuxPower_Gen3_8kW": { label: 'Inverter Hybrid LuxPower Gen3 8kW', price: 31500000, power: 8 },
        "LuxPower_Trip_15K_3P": { label: 'Inverter Hybrid LuxPower Trip 15K 3P', price: 54000000, power: 15 },
        "LuxPower_3Phase_20kW": { label: 'Inverter LuxPower 3 Phase 20kW', price: 58500000, power: 20 }
    },
    batteries: {
        "BSB_2.5kWh": { label: 'Pin Lưu Trữ Lithium BSB 2.5kWh', price: 13500000, capacity: 2.5 },
        "BSB_5kWh": { label: 'Pin Lưu Trữ Lithium BSB 5kWh', price: 22000000, capacity: 5 },
        "LS_10kWh": { label: 'Pin Lưu Trữ Lithium LS 10kWh', price: 33500000, capacity: 10 },
        "LS_16kWh": { label: 'Pin Lưu Trữ Lithium LS 16kWh', price: 41500000, capacity: 16 },
        "Deye_16kWh": { label: 'Pin Lưu Trữ Lithium Deye 16kWh', price: 52500000, capacity: 16 }
    }
};

const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Could not load image", err);
    return null;
  }
};

export const generateQuotePDF = async (lead, inverterType, batteryType, kwp) => {
  const doc = new jsPDF();
  
  const removeAccents = (str) => {
    if (!str) return "";
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  // --- 1. HEADER (Dark Navy Background) ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');
  
  // Golden accent line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 40, 210, 2, 'F');

  // Load Logo
  const logoBase64 = await getBase64ImageFromUrl('/Logo_Square.png');
  if (logoBase64) {
    // Add image on the right side of the header
    doc.addImage(logoBase64, 'PNG', 165, 5, 30, 30);
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text("BAO GIA DIEN MAT TROI", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Giai phap nang luong thong minh - Tiet kiem - Ben vung", 14, 28);


  // --- 2. CUSTOMER & QUOTE INFO ---
  // Background box for info
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 50, 182, 35, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("THONG TIN KHACH HANG", 20, 60);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Khach hang: ${removeAccents(lead.customer_name)}`, 20, 68);
  doc.text(`Dien thoai: ${lead.phone}`, 20, 75);
  // Optional: truncate address if too long
  const addressStr = `Dia chi: ${removeAccents(lead.address || 'Chua cap nhat')}`;
  doc.text(addressStr.substring(0, 45) + (addressStr.length > 45 ? "..." : ""), 20, 82);

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text("THONG TIN BAO GIA", 120, 60);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text(`Ngay tao: ${new Date().toLocaleDateString('vi-VN')}`, 120, 68);
  doc.text(`Cong suat he thong: ${kwp} kWp`, 120, 75);
  doc.text(`Nhan vien: ${removeAccents(lead.profiles?.full_name || 'Solar 24h')}`, 120, 82);

  
  // --- 3. CALCULATIONS ---
  const panelType = "AE_Solar_580W";
  const panel = pricingData.panels[panelType];
  const numPanels = Math.ceil((kwp * 1000) / panel.power);
  const panelTotal = numPanels * panel.price;

  const invOpt = pricingData.inverters[inverterType];
  const inverterQty = invOpt.power === 15 ? Math.ceil(kwp / 15) : 1;
  const inverterTotal = invOpt.price * inverterQty;
  const inverterKw = invOpt.power * inverterQty;
  
  let batteryTotal = 0;
  let batOpt = null;
  if (batteryType !== 'none') {
      batOpt = pricingData.batteries[batteryType];
      batteryTotal = batOpt.price;
  }
  
  let tuDienCost = 4500000;
  if (inverterKw >= 10 && inverterKw <= 14) tuDienCost = 6000000;
  else if (inverterKw >= 15) tuDienCost = 8000000;

  const dayDanCost = inverterKw * 650000;
  const vatTuCost = numPanels * 250000; // Mặc định mái tôn
  const vanChuyenCost = kwp * 500000; 
  
  const total = panelTotal + inverterTotal + batteryTotal + tuDienCost + dayDanCost + vatTuCost + vanChuyenCost;
  const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val) + " VND";

  const tableBody = [
    ["1", removeAccents(panel.label), `${numPanels} Tam`, formatMoney(panel.price), formatMoney(panelTotal)],
    ["2", removeAccents(invOpt.label), `${inverterQty} Bo`, formatMoney(invOpt.price), formatMoney(inverterTotal)],
  ];
  
  let counter = 3;
  if (batteryType !== 'none') {
    tableBody.push([counter++, removeAccents(batOpt.label), "1 Pack", formatMoney(batOpt.price), formatMoney(batteryTotal)]);
  }
  
  tableBody.push([counter++, "Tu dien Hybrid (Tu, CBDC, AC, Chong set)", "1 Bo", formatMoney(tuDienCost), formatMoney(tuDienCost)]);
  tableBody.push([counter++, "Day dan dien & tiep dia", "1 Bo", formatMoney(dayDanCost), formatMoney(dayDanCost)]);
  tableBody.push([counter++, "Vat tu lap dat tam pin (Mai ton)", "1 Bo", formatMoney(vatTuCost), formatMoney(vatTuCost)]);
  tableBody.push([counter++, "Chi phi van chuyen & nhan cong lap dat", "1 Lan", formatMoney(vanChuyenCost), formatMoney(vanChuyenCost)]);

  // --- 4. TABLE ---
  autoTable(doc, {
    startY: 95,
    head: [['STT', 'Hang muc', 'SL', 'Don gia', 'Thanh tien']],
    body: tableBody,
    theme: 'grid',
    headStyles: { 
        fillColor: [15, 23, 42], // slate-900 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        halign: 'center'
    }, 
    columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 32 }
    },
    styles: { fontStyle: 'normal', cellPadding: 4, fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });
  
  const finalY = doc.lastAutoTable.finalY || 100;
  
  // --- 5. TOTAL SECTION ---
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(110, finalY + 10, 86, 12, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text(`TONG CONG: ${formatMoney(total)}`, 153, finalY + 18, { align: 'center' });
  
  // --- 6. FOOTER ---
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont(undefined, 'normal');
  doc.text("Ghi chu:", 14, finalY + 30);
  doc.text("- Bao gia co gia tri trong vong 15 ngay ke tu ngay tao.", 14, finalY + 35);
  doc.text("- Bao hanh: Inverter 5 nam, Pin nang luong 12 nam (hieu suat tren 80%).", 14, finalY + 40);
  doc.text("- Gia chua bao gom 8% thue VAT.", 14, finalY + 45);
  
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text("CONG TY TNHH TMDV SOLAR 24H", 105, 280, { align: "center" });
  doc.setFont(undefined, 'normal');
  doc.text("Hotline: 0909 363 579 | Website: www.solar24h.com", 105, 285, { align: "center" });

  doc.save(`Bao_Gia_${removeAccents(lead.customer_name).replace(/ /g, '_')}.pdf`);
};
