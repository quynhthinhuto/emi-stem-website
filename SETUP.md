# Cài Đặt Và Khôi Phục / Setup And Restore

## 1. Chuẩn Bị

Cài Node.js phù hợp với `engines.node` trong `package.json` (tối thiểu 22.13.0) và pnpm theo `packageManager` của dự án (11.19.0). Mở Terminal tại thư mục chứa `package.json`.

```sh
pnpm install --frozen-lockfile
node --test tests/*.test.mjs
pnpm dev
```

Script dev mặc định dùng cổng 5173. Đọc URL được in trong Terminal. Nếu cổng đang bận, chọn cổng khác:

```sh
pnpm dev --port 5174
```

Gói mã nguồn không kèm thư viện đã cài đặt. Các phiên bản dependency được khóa trong `pnpm-lock.yaml`; cài đặt cần truy cập package registry.

## 2. Cấu Hình Bí Mật

Các giá trị bí mật của website hiện tại không được xuất. File `.env.example` và `.dev.vars.example` chỉ nêu tên biến cần thiết, không có khóa thật.

- `OPENAI_API_KEY`: chỉ cần cho API chấm lesson plan tùy chọn. Thiết lập ở môi trường server; không đưa vào JavaScript phía trình duyệt.
- `BOOK_IMPORT_TOKEN`: secret trên Cloudflare Worker, chỉ cần để bật thao tác import sách được bảo vệ. API đọc sách đã có trong kho không cần secret import này.
- `BUCKET`: binding R2, không phải chuỗi secret trong `.env`. Khai báo trong cấu hình Worker/hosting để API sách hoạt động.

Khi preview với Cloudflare, chọn `.dev.vars` hoặc `.env` cho các secret Worker; không dựa vào việc gộp cả hai, vì `.dev.vars` được ưu tiên và có thể khiến giá trị trong `.env` không được đưa vào binding `env`. Các file cấu hình thực tế đều bị `.gitignore` loại khỏi repository. Không đăng secret vào GitHub ngay cả khi repository là Private. [Hướng dẫn Cloudflare](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/).

## 3. Build Và Hosting

```sh
pnpm build
```

Dự án sử dụng Vinext/Vite và tích hợp Cloudflare Worker. Không coi đây là một static export hoàn chỉnh dành cho GitHub Pages: API sách và API chấm lesson plan chạy ở server.

`.openai/hosting.json` giữ ID của website Sites gốc để thể hiện cấu hình hiện tại. GitHub không tự xử lý file này. Khi tạo một website/hosting khác, cần cấu hình identity mới và các tài nguyên đích tương ứng; không dùng lại project ID để vô tình cập nhật website gốc.

Quyền truy cập Private của website gốc được hosting Sites quản lý bên ngoài mã nguồn. Chuyển sang hosting khác cần thiết lập lại xác thực và quyền truy cập; repository Private không tự làm cho website triển khai mới trở thành Private.

## 4. Khôi Phục 42 Sách PDF

1. Giải nén gói dữ liệu riêng `EMI-STEM-website-data-2026-10-14.zip`.
2. Tạo kho R2 và binding Worker tên `BUCKET`.
3. Đọc `lib/subject-books.json`. Với mỗi sách, tải PDF tương ứng từ thư mục `storage/` của gói dữ liệu vào đúng `key` trong danh mục, ví dụ `module-4/books/maths/ea5385737664b0c3.pdf`.
4. Đặt HTTP metadata `contentType` là `application/pdf` và custom metadata `sha256` đúng theo danh mục. API kiểm tra cả dung lượng và metadata SHA-256 trước khi phục vụ PDF.
5. Kiểm tra các URL `/api/books?subject=...&file=...`, thao tác download và HTTP Range sau khi khôi phục.

Công cụ `scripts/import-subject-books.mjs` dành cho website Sites được bảo vệ bằng token. Nếu dùng công cụ này, cần cung cấp token mới qua stdin, giữ đúng thứ tự file theo `folder` và `sourceFilename` trong danh mục. Không bỏ token vào tham số dòng lệnh hoặc file được commit. Công cụ hiện tại giới hạn origin `.chatgpt.site`, nên không dùng nguyên trạng cho hosting khác.

## 5. Tái Tạo Tài Liệu Và Media

Không cần chạy lại các công cụ này chỉ để phục hồi website: các PDF, Word, trang bìa, video và âm thanh tĩnh đã có trong `public/`.

- Các script tạo Word cần môi trường Python có `python-docx`.
- Các script render PDF/trang bìa cần thêm công cụ ngoài Node, xem import và lệnh gọi trong từng script.
- `scripts/prepare-classroom-audio.mjs` dùng `/usr/bin/say` và `/usr/bin/afconvert` trên macOS.
- Các script chuẩn bị/import sách cần file PDF nguồn; các file đó nằm trong gói dữ liệu riêng, không nằm trong repository.

Không xóa phần ghi nguồn, giấy phép hoặc metadata kiểm chứng khi sửa tài liệu. Không đặt secret vào thư mục `public/`.

## 6. Phạm Vi Kiểm Tra Bản Xuất

Danh sách file và SHA-256 nằm trong `EXPORT-FILES.json`; xuất xứ và phần bị loại nằm trong `EXPORT-INFO.json`. Hai file metadata này không tự liệt kê chính chúng. ZIP có checksum riêng bên ngoài.

Các kiểm thử Node của bản xuất được chạy trước khi đóng gói. Cài đặt dependency, build và triển khai trên một tài khoản hosting/GitHub mới chưa được thực hiện trong thao tác xuất mã nguồn này.
