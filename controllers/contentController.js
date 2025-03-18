const express = require('express');
const fs = require('fs');
const multer = require("multer");
const path = require('path');

const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
async function CreateContent(req, res) {
    const { apikey } = req.headers;
    const { length, keyword, tone, note, outline, title } = req.body;

    if (apikey == '' || typeof apikey == 'undefined') {
        writeError('key error 2');
        res.status(500).send("Key không hợp lệ");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apikey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const Prompt = `
            ${note},
            Bạn là một nhà sáng tao nội dung. Dựa vào dàn ý theo file JSON: \`\`\`json\n\n ${outline} \n\n\`\`\` và viết giúp tôi một bài viết SEO thõa mãn tất cả các tiêu chí sau:
            1. Phong cách viết: ${tone}
            2. Từ khóa mục tiêu: **${keyword}**
            3. Giữ nguyên nội dung và thứ tự các tiêu đề H2, H3 theo dàn ý
            4. Nội dung dài: ${length}
            5. Tiêu đề bài viết: ${title}
            6. Mật độ từ khóa chính: trên 1%
            7. Bỏ tiêu đề "Kết luận", "Lời kết", "Mở đầu", "Tóm lại", "Tổng kết",...
            8. Thêm emoji vào các vị trí phù hợp trong nội dung
            Sau khi hoàn thành, cung cấp SEO Description (160-300 ký tự) và SEO Title (40-70 ký tự) cho bài viết
            *Lưu ý: chỉ trả về dạng markdown theo cấu trúc JSON bên dưới.
            \`\`\`json
            {
                \"content\": string (markdown) - Nội dung bài viết,
                \"title\": string - Seo title,
                \"description\": string - Seo description
            }
            \`\`\`
            *Lưu ý: chuyển đổi phần nội dung của content sang dạng json encode để chắc chắn không bị lỗi khi parse json
        `;
        const response = await model.generateContentStream(Prompt);

        res.setHeader('Content-Type', 'text/stream');
        for await (const chunk of response.stream) {
            const data = {
                content: chunk.text(),
                promptTokenCount: chunk.usageMetadata.promptTokenCount,
                candidatesTokenCount: chunk.usageMetadata.candidatesTokenCount,
                totalTokenCount: chunk.usageMetadata.totalTokenCount
            };
            res.write(JSON.stringify(data));
        }
        // writeLog();
        res.end();
    } catch (error) {
        // writeError(error);
        // console.error("Error generating response: ", error);
        res.status(500).send("An error occurred while generating the response");
    }
}
async function CreateOutline(req, res) {
    const { apikey } = req.headers;
    const { length, keyword, title, tone } = req.body;

    if (apikey == '' || typeof apikey == 'undefined') {
        writeError('key error 1');
        res.status(500).send("Key không hợp lệ");
        return false;
    }

    try {
        const genAI = new GoogleGenerativeAI(apikey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', tools: [{ 'google_search': {} }] });
        const Prompt = `Bạn là một nhà sáng tạo nội dung. Hãy tạo và chỉ hiển thị cho tôi dàn ý để viết một bài viết SEO thỏa các tiêu chí bên dưới:
            1. Phong cách viết: ${tone}
            2. Tối đa 4 lần xuất hiện H2
            3. Không viết về các quy trình hoặc cách đặt hàng
            4. Không so sánh với các đối thủ khác
            5. Bỏ tiêu đề "Kết luận", "Lời kết", "Mở đầu", "Tóm lại", "Tổng kết",...
            6. Độ dài bài viết: ${length}
            7. Từ khóa mục tiêu: ${keyword}
            8. Tiêu đề bài viết: ${title}
            *Lưu ý: Chỉ trả về dạng markdown theo cấu trúc JSON bên dưới.
            \`\`\`json
            [
                {
                    "name": "<Tiêu đề H2>",
                    "subHeadings": [
                        "name": "<Tiêu đề H3>",
                    ],
                }
            ]
            \`\`\`
            *Lưu ý: chuyển đổi phần nội dung của content sang dạng json encode để chắc chắn không bị lỗi khi parse json
            *Lưu ý: Không sử dụng nháy đôi (double quotes) trong nội dung json
        `;
        const response = await model.generateContentStream(Prompt);

        res.setHeader('Content-Type', 'text/stream');
        for await (const chunk of response.stream) {
            const data = {
                content: chunk.text(),
                promptTokenCount: chunk.usageMetadata.promptTokenCount,
                candidatesTokenCount: chunk.usageMetadata.candidatesTokenCount,
                totalTokenCount: chunk.usageMetadata.totalTokenCount
            };
            res.write(JSON.stringify(data));
        }
        // writeLog();
        res.end();
    } catch (error) {
        // writeError(error);
        // console.error("Error generating response: ", error);
        res.status(500).send("An error occurred while generating the response");
    }
}

function writeLog() {
    const filePath = path.join(__dirname, 'apilog.txt'); // __dirname là thư mục của file script
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi khi đọc file:', err);
            return;
        }

        count = parseFloat(data);
        count++;

        fs.writeFile(filePath, count.toString(), 'utf8', (err) => {
            if (err) {
                console.error('Lỗi khi ghi file:', err);
                return;
            }
            console.log('Đã cập nhật file thành công!');
        });
    });
}
function writeError(error = "") {
    const filePath = path.join(__dirname, 'apilog_error.txt'); // __dirname là thư mục của file script

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi khi đọc file:', err);
            return;
        }

        newContent = data;
        newContent += `[Lỗi]_[${error}]\n\n`;

        fs.writeFile(filePath, newContent, 'utf8', (err) => {
            if (err) {
                console.error('Lỗi khi ghi file:', err);
                return;
            }
            console.log('Đã cập nhật file thành công!');
        });
    });
}

module.exports = { CreateContent, CreateOutline };
