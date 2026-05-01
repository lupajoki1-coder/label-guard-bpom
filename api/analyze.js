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

    const prompt = `Anda adalah Executive Consultant di bidang Regulatory Affairs & Corporate Compliance.
Fokus audit Anda: Kepatuhan label pangan olahan berdasarkan regulasi terkini BPOM dan regulasi Sertifikasi Halal BPJPH.
Lakukan audit zero-tolerance yang ringkas, padat data, dan sangat profesional. Hindari gaya bahasa AI. Berikan rekomendasi yang berorientasi pada mitigasi risiko bisnis dan go-to-market.

Kriteria Audit Wajib:
1. Nama Produk (Trade name & Jenis Pangan)
2. Daftar Bahan (Komposisi lengkap, urutan, & identifikasi Alergen)
3. Berat Bersih/Isi Bersih (Sistem metrik)
4. Informasi Produsen/Importir (Nama PT/CV, lokasi)
5. Sertifikasi Halal BPJPH (Wajib menggunakan logo Halal BPJPH terbaru beserta nomor sertifikat)
6. Tanggal & Kode Produksi (Sistem pelacakan/traceability)
7. Keterangan Kedaluwarsa (Format Exp Date/Best Before yang presisi)
8. Nomor Izin Edar (Format MD/ML/P-IRT yang valid)
9. Informasi Nilai Gizi / Nutrition Facts (Tabel format standar BPOM)
10. Peringatan Khusus (Alergen, Pemanis Buatan, dll jika relevan)

KEMBALIKAN HANYA JSON MURNI (tanpa markdown \`\`\`json) dengan struktur:
{
  "product_name": "<Nama Produk>",
  "score": <angka_0_100>,
  "level": "<Aman / Risiko Sedang / Risiko Tinggi>",
  "violations": [
    "<Pelanggaran spesifik 1 (kosongkan jika sempurna)>"
  ],
  "consultant_recommendations": [
    "<Rekomendasi taktis & strategis 1>"
  ],
  "details": [
    {
      "element": "Nama Produk",
      "status": "COMPLIANT" /* atau "NON-COMPLIANT" */,
      "finding": "<Temuan objektif & padat data>",
      "risk_impact": "<Dampak komersial/hukum singkat>"
    }
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
