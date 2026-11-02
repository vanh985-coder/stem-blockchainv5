# Kế hoạch triển khai dịch chuyển trên bản đồ lớn
- Sửa file: packages/core/src/three/world/map/BigMap.tsx, packages/core/src/three/world/map/mapMarkers.ts, packages/core/src/three/walkApi.ts, packages/core/src/three/WalkWorld.tsx, packages/core/src/content/minimap.ts, docs/specs/03-dong-co-3d-giao-dien-chung.md.
- Tạo file mới: packages/core/src/three/world/teleport.ts, packages/core/src/three/world/teleport.test.ts, scripts/ban-do-teleport-check.mjs.
- Thêm hàm mới:
  + `teleportTarget(dest, world)` thuần trong `teleport.ts`: tính tọa độ an toàn và yaw quay về mục tiêu.
  + `teleport(x, z, yaw)` trong `WalkApi` / `WalkWorld.tsx`: cập nhật `player.x`, `player.z`, `player.yaw`, `player.vx/vz/vy = 0`, `groundHeight` và `camera.yaw`.
  + `getActiveWalkApi()` / `setActiveWalkApi(api)` trong `walkApi.ts` để `BigMap` gọi dịch chuyển.
- Lấy tọa độ an toàn:
  + Tâm chợ: nút `ring:6` (0, -12.5) trên vòng đường quanh cây đa của `roadGraph` (`world.graph`), quay mặt về (0, 0).
  + 4 cổng làng: `gateApproachSpawn(world, gate, 8.5)` cách cổng 8.5 đơn vị, quay mặt vào cổng.
  + 12 biển màn: nút đường `board:<level>` trước biển trong `roadGraph`, quay mặt về biển `(b.x, b.z)`.
  + 16 thẻ chưa nhặt: điểm cách thẻ 3 đơn vị về phía nút `roadGraph` gần nhất, quay mặt về thẻ.
- Kiểm va chạm bằng hàm có sẵn: `resolveCollisions(p, PLAYER_RADIUS, obstacles, boundsRadius)` từ `packages/core/src/three/collision.ts`.
- Đặt vị trí người chơi thành công qua `api.player` (PlayerState) và `api.teleport(x, z, yaw)` được đồng bộ trực tiếp trong khung 3D.
