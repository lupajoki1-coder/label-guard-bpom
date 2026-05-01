export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    const { image } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key tidak ditemukan di server Vercel (Environment Variables).' });
    }

    if (!image) {
        return res.status(400).json({ error: 'Gambar tidak ditemukan dalam request.' });
    }

    const prompt = `Anda adalah Konsultan Hukum & Bisnis Korporasi Senior spesialis Kepatuhan Regulasi Pangan BPOM (PerBPOM No 31/2018, PerBPOM No 26/2021, dll).
Tugas Anda: Melakukan audit kepatuhan label pangan secara SANGAT KETAT, TERPERINCI, dan TANPA TOLERANSI (zero-tolerance) terhadap kesalahan visual.

Kriteria Wajib (Berdasarkan Aturan Baku):
1. Nama Produk (Trade name & Jenis Pangan)
2. Daftar Bahan (Komposisi lengkap & identifikasi Alergen)
3. Berat Bersih/Isi Bersih (Sistem metrik wajib)
4. Nama & Alamat Produsen/Importir (Minimal nama PT/CV, kota & negara)
5. Logo Halal (Bagi yang wajib/mengklaim)
6. Tanggal & Kode Produksi (Traceability wajib ada)
7. Keterangan Kedaluwarsa (Exp Date, format harus jelas)
8. Nomor Izin Edar (BPOM RI MD/ML atau P-IRT harus tervalidasi formatnya)
9. Informasi Nilai Gizi / Nutrition Facts (Tabel format standar BPOM)
10. Peringatan Khusus (Alergen, Pemanis Buatan, dll jika relevan)

Instruksi Output Konsultan:
- Analisis setiap poin dengan kejelian tingkat auditor senior.
- Catat SETIAP pelanggaran regulasi sekecil apapun (font tidak terbaca, posisi salah, format nomor salah).
- Berikan rekomendasi strategis bisnis korporat untuk mitigasi risiko hukum, penarikan produk (recall), dan peningkatan branding/kepercayaan konsumen.

KEMBALIKAN HANYA JSON MURNI (tanpa markdown \`\`\`json) dengan struktur:
{
  "product_name": "<Nama Produk yang terdeteksi, atau 'Unknown'>",
  "score": <angka_0_100>,
  "level": "<Aman / Risiko Sedang / Risiko Tinggi>",
  "violations": [
    "<Detail pelanggaran regulasi 1, atau kosongkan jika sempurna>",
    "<Detail pelanggaran regulasi 2>"
  ],
  "consultant_recommendations": [
    "<Saran strategis bisnis 1 (Misal: Risiko denda administratif...)>",
    "<Saran strategis bisnis 2>"
  ],
  "details": [
    {"item": "Nama Produk", "status": true/false, "notes": "Analisis terperinci..."}
  ]
}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: "image/jpeg", data: image } }
                    ]
                }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Gagal menghubungi Gemini API');
        }

        let textResponse = data.candidates[0].content.parts[0].text;
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return res.status(200).json(JSON.parse(textResponse));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
