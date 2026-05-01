export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    const { images } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key tidak ditemukan di server Vercel (Environment Variables).' });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Gambar tidak ditemukan dalam request.' });
    }

    const prompt = `Anda adalah Executive Consultant di bidang Regulatory Affairs & Corporate Compliance.
Fokus audit Anda: Kepatuhan label pangan olahan berdasarkan regulasi terkini BPOM dan Sertifikasi Halal BPJPH (Khususnya Kepkaban BPJPH No 78 Tahun 2023 dan Surat Edaran No 7 Tahun 2025).
Pengguna akan melampirkan BEBERAPA FOTO dari SATU PRODUK yang sama. Analisis semuanya sebagai kesatuan.
Lakukan audit zero-tolerance yang SANGAT RINGKAS dan PADAT DATA. Jangan berikan rincian tabel elemen panjang. Fokus HANYA pada tingkat kepatuhan, daftar pelanggaran yang kritis, serta rekomendasi. Wajib menyebutkan referensi regulasi (misal: PerBPOM 31/2018, SE BPJPH No 7/2025) di setiap pelanggaran dan rekomendasi.
Penting untuk Halal: Wajib cek keberadaan Logo Halal Indonesia (ungu/hijau) yang sah dan format nomor sertifikat (contoh: ID1234...). Jika nomor tidak jelas/salah, jadikan pelanggaran.

KEMBALIKAN HANYA JSON MURNI (tanpa markdown \`\`\`json) dengan struktur:
{
  "product_name": "<Nama Produk>",
  "score": <angka_0_100>,
  "level": "<Aman / Risiko Sedang / Risiko Tinggi>",
  "halal_cert_number": "<Nomor sertifikat halal yang terdeteksi, atau null jika tidak ada>",
  "violations": [
    "<Pelanggaran 1 + Referensi Regulasi (Kosongkan jika sempurna)>"
  ],
  "consultant_recommendations": [
    "<Rekomendasi taktis 1 (Ringkas, padat regulasi)>"
  ]
}`;

    try {
        const imageParts = images.map(imgBase64 => ({
            inline_data: { mime_type: "image/jpeg", data: imgBase64 }
        }));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        ...imageParts
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
