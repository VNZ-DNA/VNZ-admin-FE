# VNZ Admin

Thư mục này là root của repository Admin độc lập. Không cần source hoặc dependency của Website.

## Cài đặt và kiểm tra

Dùng pnpm `10.34.5`, theo trường `packageManager` trong `package.json`.

Môi trường đã dùng để kiểm tra: Node.js `24.19.0` và pnpm `10.34.5`.

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm test:typecheck
```

Workspace riêng của Admin gồm ứng dụng tại root và package kiểm thử `tests`. Cả hai dùng chung một `pnpm-lock.yaml` tại root Admin; không tạo lockfile riêng trong `tests`.

Commit cả `package.json`, `pnpm-workspace.yaml` và `pnpm-lock.yaml`. Khi thay đổi dependency, chạy `pnpm install` tại root Admin và commit lockfile cập nhật.

## Chạy local

Copy `.env.example` thành `.env.local`, cấu hình `VITE_API_URL`, sau đó chạy `pnpm dev`. Admin chạy tại `http://localhost:3001`.

Không commit `.env.local`, `node_modules`, `dist` hoặc các file build/cache. Khi push repository mới, lấy toàn bộ nội dung thư mục này làm root.
