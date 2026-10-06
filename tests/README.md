# Kiểm thử Admin

Đây là package kiểm thử riêng `@vnz/admin-tests`. Toàn bộ file test, cấu hình Vitest, cấu hình TypeScript và dependency riêng của kiểm thử nằm trong thư mục này. Cấu hình chạy/build Admin không phụ thuộc vào package kiểm thử.

## Cấu trúc

- `components/`, `features/`: kiểm thử bằng Vitest và `jsdom`.
- `contracts/`: các kiểm thử Node hiện có, gồm kiểm tra source/CSS và utility.
- `vitest.config.ts`: cấu hình kiểm thử, alias `@` trỏ đến `../src`; không nạp file `.env` của ứng dụng.
- `tsconfig.json`: cấu hình kiểm tra kiểu của bộ test.

Test vẫn cần source và dependency của Admin để kiểm tra ứng dụng; đây không phải bản sao source độc lập. Thư mục `src` không chứa test hoặc cấu hình kiểm thử.

## Chạy từ thư mục gốc repository

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm test:typecheck
```

Root repository Admin là thư mục `apps/admin` hiện tại. Workspace riêng của Admin chỉ gồm ứng dụng và package `tests`, cùng dùng một `pnpm-lock.yaml` tại root Admin.

Có thể chạy riêng từng bộ bằng `pnpm --filter @vnz/admin-tests test:unit` hoặc `pnpm --filter @vnz/admin-tests test:contracts`. Lệnh `test` trả lỗi nếu bất kỳ bộ nào thất bại; không tự bỏ qua test lỗi.

`jsdom` mô phỏng môi trường trình duyệt cho test React, không phải môi trường API. Các file `.env`, `index.html`, cấu hình Vite/TypeScript và `package.json` của ứng dụng vẫn được giữ tại Admin để ứng dụng chạy/build bình thường.
