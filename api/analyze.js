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

    const prompt = `Anda adalah inspektur kepatuhan BPOM Indonesia. Evaluasi gambar label pangan ini secara ketat berdasarkan 10 kriteria wajib berikut:
1. Nama Produk (Dagang & Jenis)
2. Daftar Bahan (Komposisi)
3. Berat Bersih/Isi Bersih
4. Nama & Alamat Produsen/Importir
5. Logo Halal (jika ada)
6. Tanggal/Kode Produksi
7. Keterangan Kedaluwarsa (Exp Date)
8. Nomor Izin Edar (BPOM/P-IRT)
9. Informasi Nilai Gizi (Nutrition Facts)
10. Peringatan (alergen/lainnya)

KEMBALIKAN HANYA JSON MURNI (tanpa markdown \`\`\`json) dengan struktur persis seperti ini:
{
  "score": <angka_0_100>,
  "level": "<Tinggi/Sedang/Rendah>",
  "details": [
    {"item": "Nama Produk", "status": true/false, "notes": "alasan singkat"}
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
