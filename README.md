# EMI-STEM Training Website

Mã nguồn website tập huấn dạy học STEM bằng tiếng Anh dành cho giáo viên tại Việt Nam, kèm các tài nguyên giao diện đã xuất bản.

English-Vietnamese STEM teacher training website, with its published source code and bundled frontend resources.

## Bản Xuất / Export

- Ngày xuất: 2026-10-14, múi giờ Australia/Adelaide.
- Website nguồn: https://emi-stem-vietnam-training-20260913.quynhthinhuto.chatgpt.site
- Phiên bản đã xuất bản: 80.
- Source commit: `61e1c701720e9b3dd78c0dec843d3643c4c2f3e2`.
- Gói này không có `.git`, remote Git, khóa API, mật khẩu, token, `node_modules` hoặc cache build.
- Các bổ sung cho bản xuất: README, hướng dẫn cài đặt, file cấu hình mẫu không có bí mật, danh mục kiểm tra và quy tắc `.gitignore` bảo vệ các file cấu hình thực tế.

## Cấu Trúc / Structure

- `app/`: trang entry và server API đọc sách PDF, đánh giá lesson plan.
- `public/`: trang HTML, CSS, JavaScript, hình ảnh, PDF, Word, 3 video đã upload và các file âm thanh luyện tập.
- `lib/`: danh mục sách, lesson plan và logic xử lý tài nguyên.
- `scripts/`: các công cụ build, sinh tài nguyên, tạo tài liệu và import sách.
- `tests/`: bộ kiểm thử logic, điều hướng và tài nguyên website.
- `build/`, `vendor/`: phần tích hợp runtime/build và các thành phần có giấy phép đi kèm.
- `.openai/hosting.json`: cấu hình liên kết website Sites hiện tại; đây không phải khóa bí mật.
- `package.json`, `pnpm-lock.yaml`, `vite.config.ts`: cấu hình công cụ, dependency và build.

## Cài Đặt / Setup

Xem [SETUP.md](SETUP.md) để cài đặt, chạy kiểm thử và xử lý kho sách cloud. Bộ tài nguyên tĩnh và code được giữ đầy đủ trong gói này. Các sách PDF trong R2 cần được khôi phục riêng nếu chuyển hosting.

## Đưa Lên GitHub / Upload To GitHub

Giải nén ZIP trước. Repository phải có `package.json`, `app/` và `public/` ở thư mục gốc; không tải nguyên file ZIP lên làm mã nguồn.

Do có hơn 6.000 file, nên dùng GitHub Desktop hoặc Git thay vì tải từng file trong trình duyệt. GitHub cho phép tải tối đa 100 file mỗi lần qua giao diện web; giới hạn qua web là 25 MiB mỗi file, còn Git thông thường chặn file lớn hơn 100 MiB. File lớn nhất trong bản xuất này khoảng 10,1 MB, nên không cần Git LFS để đẩy bản hiện tại. [Nguồn GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository), [giới hạn file lớn](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

### Cách 1: GitHub Desktop

1. Mở GitHub Desktop và đăng nhập tài khoản của bạn.
2. Chọn `File > Add Local Repository`, chọn thư mục đã giải nén. Nếu Desktop báo chưa có Git repository, chọn tạo repository tại thư mục này; xác nhận đường dẫn chứa `package.json` để tránh tạo một thư mục con rỗng.
3. Commit các file nếu Desktop chưa tạo initial commit.
4. Chọn `Publish repository`, đặt tên, giữ `Keep this code private`, rồi xác nhận xuất bản.

[Hướng dẫn thêm repository](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop), [hướng dẫn xuất bản](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop).

### Cách 2: Terminal

Tạo repository **Private** và rỗng trên GitHub, không khởi tạo sẵn README hoặc `.gitignore`. Mở Terminal ở thư mục chứa `package.json` rồi chạy:

```sh
git init -b main
git add .
git commit -m "Import EMI-STEM website source"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Thay `YOUR-ACCOUNT` và `YOUR-REPOSITORY` bằng thông tin của bạn. Xác thực bằng phương thức GitHub hỗ trợ; không chèn token vào URL hay commit token vào mã nguồn. [Hướng dẫn GitHub chính thức](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

## Dữ Liệu Cloud Và Quyền Truy Cập

42 sách PDF của Module 4 đang nằm trong kho R2, không phải trong repository. Danh mục và code truy cập sách nằm trong `lib/subject-books.json` và `app/api/books/route.ts`. Các PDF đó đã được lưu trong gói sao lưu dữ liệu `EMI-STEM-website-data-2026-10-14.zip` riêng, dưới `storage/module-4/books/`.

Đẩy code lên GitHub không đồng nghĩa với việc khôi phục kho R2, cấu hình bí mật, quyền truy cập website hoặc xuất bản một website mới. GitHub Pages không chạy các server API của dự án này. Website đầy đủ cần hosting hỗ trợ Cloudflare Workers/Vinext và R2. [Phạm vi GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

Tiến độ từ vựng lưu ở trình duyệt của từng người học và bản ghi âm tạm thời không được đưa vào repository. Các video nhúng và liên kết ngoài vẫn là liên kết.

Nên giữ repository **Private** vì có tài liệu và nội dung media cần quyền sử dụng phù hợp. Giữ nguyên thông tin nguồn và các giấy phép đi kèm. Bản xuất này không cấp lại quyền sử dụng đối với tài liệu của bên thứ ba.
