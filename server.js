require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// إعدادات الخادم
app.use(cors());
app.use(express.json());

// تشغيل مجلد الواجهة (public)
app.use(express.static(path.join(__dirname, 'public')));

// تهيئة ذكاء Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// المسار الخاص بقراءة الرسالة واستخراج النقطة
app.post('/api/extract', async (req, res) => {
    try {
        const { emailText } = req.body;
        if (!emailText) return res.status(400).json({ error: 'الرجاء إدخال نص الرسالة' });

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a precise data extraction assistant. Your sole task is to analyze the following email text (which contains exam results) and extract the final student score or grade.

Strict Rules:
1. The score must be a number between 0 and 20.
2. It can contain up to two decimal places (e.g., 14.5, 17.25, 10).
3. Respond ONLY with the extracted number. Do not include any greeting, explanation, markdown formatting, or extra text.
4. If you cannot find a valid score between 0 and 20 in the text, respond exactly with the word: NOT_FOUND

Email Content:
${emailText}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        if (text === 'NOT_FOUND') {
            return res.status(404).json({ error: 'لم يتم العثور على نقطة صالحة (بين 0 و 20) في النص.' });
        }

        const score = parseFloat(text);
        if (isNaN(score)) {
            return res.status(500).json({ error: 'حدث خطأ في فهم النقطة.' });
        }

        // إرسال النقطة بنجاح إلى الواجهة
        res.json({ success: true, score: score });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'حدث خطأ في الاتصال بالذكاء الاصطناعي.' });
    }
});
// في بيئة Vercel لا نحتاج لـ app.listen التقليدي
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;



