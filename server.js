const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Thư mục lưu trữ file upload
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Đường dẫn lưu trữ file dữ liệu quiz & dữ liệu hệ thống (sử dụng đường dẫn tương đối an toàn)
const ABSOLUTE_QUIZ_FILE = path.join(__dirname, 'public', 'sports_quiz_100.json');
const DATA_FILE = path.join(__dirname, 'data.json');
const DYNAMIC_TABLES_FILE = path.join(__dirname, 'dynamic_tables.json');
const CONFIG_FILE = path.join(__dirname, 'layout-config.json');
const QUIZ_HTML_FILE = path.join(__dirname, 'public', 'quiz_client.html');

// Cấu hình mặc định hệ thống
const DEFAULT_CONFIG = {
    theme: {
        bgType: 'color',
        bgColor: '#f4f6f9',
        bgUrl: '',
        primaryColor: '#1677ff',
        customCss: '',      
        customJs: ''       
    },
    navItems: [
        { 
            id: 'trangchu', 
            name: 'TRANG CHỦ AD88', 
            type: 'link', 
            url: 'https://ad88v9.com/', 
            icon: 'fa-house',
            customCss: ''  
        },
        { 
            id: 'luutrinh', 
            name: 'LƯU TRÌNH', 
            type: 'luutrinh', 
            icon: 'fa-file-lines', 
            customCss: '' 
        },
        { 
            id: 'test', 
            name: 'TEST SẢN PHẨM', 
            type: 'table', 
            icon: 'fa-vial-circle-check', 
            customCss: '' 
        }
    ]
};

// Hàm đọc/ghi file JSON an toàn
function readJsonFile(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
        } catch(e) {
            console.error("Lỗi tạo file mặc định:", e);
        }
        return defaultValue;
    }
    try { 
        return JSON.parse(fs.readFileSync(filePath, 'utf8')); 
    } catch (err) { 
        return defaultValue; 
    }
}

function writeJsonFile(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error(`Lỗi khi ghi dữ liệu ra file ${filePath}:`, err);
    }
}

// Khai báo bộ dữ liệu trong bộ nhớ
let docsData = readJsonFile(DATA_FILE, []);
let dynamicTablesData = readJsonFile(DYNAMIC_TABLES_FILE, {});
let layoutConfig = readJsonFile(CONFIG_FILE, DEFAULT_CONFIG);
let adminUser = { username: "hiload88", password: "long1995" };

// Điều hướng trang tĩnh
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/quiz', (req, res) => {
    if (fs.existsSync(QUIZ_HTML_FILE)) {
        return res.sendFile(QUIZ_HTML_FILE);
    }
    res.status(404).send('Chưa cấu hình giao diện Quiz!');
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'client.html')));
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================================
   1. API QUẢN LÝ DỮ LIỆU CÂU HỎI & GIAO DIỆN TRẮC NGHIỆM (QUIZ)
   ========================================================= */

// API tương thích cho lấy danh sách câu hỏi Quiz
app.get('/api/questions', (req, res) => {
    const quizData = readJsonFile(ABSOLUTE_QUIZ_FILE, []);
    res.json(quizData);
});

app.get('/api/sports-quiz', (req, res) => {
    const quizData = readJsonFile(ABSOLUTE_QUIZ_FILE, []);
    res.json(quizData);
});

// API Cập nhật/Ghi trực tiếp file dữ liệu sports_quiz_100.json
app.post('/api/sports-quiz/update-json', (req, res) => {
    try {
        const { rawJson } = req.body;
        let parsedData = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        
        writeJsonFile(ABSOLUTE_QUIZ_FILE, parsedData);
        res.json({ success: true, message: "Đã cập nhật trực tiếp file sports_quiz_100.json thành công!" });
    } catch (err) {
        res.status(400).json({ success: false, message: "Định dạng JSON không hợp lệ: " + err.message });
    }
});

// API Lưu trực tiếp Mã Code HTML/JS của trang Quiz từ Admin Web ra file quiz_client.html
app.post('/api/sports-quiz/update-html', (req, res) => {
    try {
        const { htmlContent } = req.body;
        if (!htmlContent) {
            return res.status(400).json({ success: false, message: "Nội dung Code không được để trống!" });
        }
        
        fs.writeFileSync(QUIZ_HTML_FILE, htmlContent, 'utf8');
        res.json({ success: true, message: "Đã lưu trực tiếp mã nguồn Frontend Quiz vào file HTML!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi khi lưu file HTML: " + err.message });
    }
});

// API lấy mã nguồn HTML hiện tại của trang Quiz lên Admin
app.get('/api/sports-quiz/get-html', (req, res) => {
    if (fs.existsSync(QUIZ_HTML_FILE)) {
        const content = fs.readFileSync(QUIZ_HTML_FILE, 'utf8');
        return res.json({ success: true, content });
    }
    res.json({ success: false, content: '' });
});

/* =========================================================
   2. API BẢNG DANH SÁCH ĐỘNG & IMPORT JSON BẢO LƯU FILE
   ========================================================= */

// API Lấy dữ liệu bảng động
app.get('/api/dynamic-table/:tabId', (req, res) => {
    const { tabId } = req.params;
    if (tabId === 'test' || tabId === 'quiz' || tabId === 'sports_quiz' || tabId === 'testsanpham') {
        const quizData = readJsonFile(ABSOLUTE_QUIZ_FILE, []);
        return res.json(quizData);
    }
    res.json(dynamicTablesData[tabId] || []);
});

// API Import hàng loạt từ file JSON đẩy lên
app.post('/api/dynamic-table/:tabId/import', (req, res) => {
    try {
        const { tabId } = req.params;
        const questions = req.body;

        if (!Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: "Dữ liệu JSON phải là dạng mảng []." });
        }

        const formattedQuestions = questions.map((q, idx) => ({
            id: q.id || (Date.now() + idx).toString(),
            category: q.category || 'Chung',
            difficulty: q.difficulty || 'Dễ',
            question: q.question || q.title || '',
            options: Array.isArray(q.options) ? q.options : [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''],
            answer: typeof q.answer === 'number' ? q.answer : parseInt(q.answer || 0),
            explanation: q.explanation || q.note || ''
        }));

        if (tabId === 'test' || tabId === 'quiz' || tabId === 'sports_quiz' || tabId === 'testsanpham') {
            writeJsonFile(ABSOLUTE_QUIZ_FILE, formattedQuestions);
        } else {
            dynamicTablesData[tabId] = formattedQuestions;
            writeJsonFile(DYNAMIC_TABLES_FILE, dynamicTablesData);
        }

        return res.json({ 
            success: true, 
            message: "Import thành công!", 
            count: formattedQuestions.length 
        });
    } catch (error) {
        console.error("Lỗi Import Backend:", error);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi xử lý file JSON." });
    }
});

// API Thêm mới / Cập nhật 1 câu hỏi
app.post('/api/dynamic-table/:tabId', (req, res) => {
    const { tabId } = req.params;
    const rowItem = req.body;

    let targetData = [];
    const isQuizTab = (tabId === 'test' || tabId === 'quiz' || tabId === 'sports_quiz' || tabId === 'testsanpham');

    if (isQuizTab) {
        targetData = readJsonFile(ABSOLUTE_QUIZ_FILE, []);
    } else {
        targetData = dynamicTablesData[tabId] || [];
    }

    const index = targetData.findIndex(r => String(r.id) === String(rowItem.id));
    if (index !== -1) {
        targetData[index] = rowItem;
    } else {
        targetData.push(rowItem);
    }

    if (isQuizTab) {
        writeJsonFile(ABSOLUTE_QUIZ_FILE, targetData);
    } else {
        dynamicTablesData[tabId] = targetData;
        writeJsonFile(DYNAMIC_TABLES_FILE, dynamicTablesData);
    }

    res.json({ success: true, message: "Đã cập nhật dữ liệu thành công!" });
});

// API Xóa 1 câu hỏi
app.delete('/api/dynamic-table/:tabId/:rowId', (req, res) => {
    const { tabId, rowId } = req.params;

    let targetData = [];
    const isQuizTab = (tabId === 'test' || tabId === 'quiz' || tabId === 'sports_quiz' || tabId === 'testsanpham');

    if (isQuizTab) {
        targetData = readJsonFile(ABSOLUTE_QUIZ_FILE, []);
    } else {
        targetData = dynamicTablesData[tabId] || [];
    }

    targetData = targetData.filter(r => String(r.id) !== String(rowId));

    if (isQuizTab) {
        writeJsonFile(ABSOLUTE_QUIZ_FILE, targetData);
    } else {
        dynamicTablesData[tabId] = targetData;
        writeJsonFile(DYNAMIC_TABLES_FILE, dynamicTablesData);
    }

    res.json({ success: true, message: "Đã xóa bản ghi thành công!" });
});

/* =========================================================
   3. API HỆ THỐNG TÙY CHỈNH GIAO DIỆN & HỆ THỐNG CHUNG
   ========================================================= */

app.get('/api/layout-config', (req, res) => res.json(layoutConfig));

app.post('/api/layout-config', (req, res) => {
    layoutConfig = req.body;
    writeJsonFile(CONFIG_FILE, layoutConfig);

    if (Array.isArray(layoutConfig.navItems)) {
        const quizItem = layoutConfig.navItems.find(item => item.id === 'test' || item.id === 'quiz' || (item.customCss && item.customCss.includes('<!DOCTYPE html>')));
        if (quizItem && quizItem.customCss) {
            fs.writeFileSync(QUIZ_HTML_FILE, quizItem.customCss, 'utf8');
        }
    }

    res.json({ success: true, message: "Đã lưu tất cả tùy chỉnh giao diện!" });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === adminUser.username && password === adminUser.password) {
        return res.json({ success: true, username: adminUser.username, token: "mock-token-12345" });
    }
    return res.json({ success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" });
});

app.post('/api/admin/change-password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    if (username === adminUser.username && oldPassword === adminUser.password) {
        adminUser.password = newPassword;
        return res.json({ success: true, message: "Đổi mật khẩu thành công!" });
    }
    return res.json({ success: false, message: "Mật khẩu cũ không chính xác!" });
});

app.post('/api/upload-bg-image', (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, message: "Không có dữ liệu ảnh!" });

    try {
        const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ success: false, message: "Định dạng không hợp lệ!" });

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `bg_${Date.now()}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, fileName);

        fs.writeFileSync(filePath, buffer);
        res.json({ success: true, url: `/uploads/${fileName}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi lưu ảnh nền!" });
    }
});

app.post('/api/upload-pasted-image', (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, message: "Không có dữ liệu ảnh!" });

    try {
        const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ success: false, message: "Định dạng không hợp lệ!" });

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, fileName);

        fs.writeFileSync(filePath, buffer);
        res.json({ success: true, url: `/uploads/${fileName}` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi lưu ảnh!" });
    }
});

app.get('/api/camnangad88', (req, res) => res.json(docsData));

app.post('/api/camnangad88', (req, res) => {
    const newItem = req.body;
    const index = docsData.findIndex(item => item.ID === newItem.ID);
    if (index !== -1) {
        docsData[index] = { ...docsData[index], ...newItem };
    } else {
        newItem.IsHidden = false;
        docsData.push(newItem);
    }
    writeJsonFile(DATA_FILE, docsData);
    res.json({ success: true, message: "Đã lưu thành công!" });
});

app.patch('/api/camnangad88/:id/toggle-hide', (req, res) => {
    const { id } = req.params;
    const index = docsData.findIndex(item => item.ID === id);
    if (index !== -1) {
        docsData[index].IsHidden = !docsData[index].IsHidden;
        writeJsonFile(DATA_FILE, docsData);
        return res.json({ 
            success: true, 
            isHidden: docsData[index].IsHidden, 
            message: docsData[index].IsHidden ? "Đã ẩn bài viết thành công!" : "Đã hiện bài viết thành công!" 
        });
    }
    res.status(404).json({ success: false, message: "Không tìm thấy bài viết!" });
});

app.delete('/api/camnangad88/:id', (req, res) => {
    const { id } = req.params;
    docsData = docsData.filter(item => item.ID !== id);
    writeJsonFile(DATA_FILE, docsData);
    res.json({ success: true, message: "Đã xóa thành công!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server AD88 đang chạy tại http://localhost:${PORT}`));