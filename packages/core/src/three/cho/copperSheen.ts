import type { MeshStandardMaterial } from 'three';

/**
 * Ánh kim giả cho đồng của máy soi dấu (bước L4): cảnh không có bản đồ môi trường nên kim loại vốn tối và phẳng. Dùng `material.envMap` thì three đổi bản đồ sang dạng PMREM ngay lần dùng đầu tiên trên luồng chính:
 * đo trên bản build thấy một khung 380 đến 400 ms (Vừa, Cao), không chịu được. Ở đây phản chiếu một bầu trời giả (trời xanh ở trên, chân trời sáng, đất sẫm ở dưới, một vệt nắng) được tính thẳng trong bộ đổ bóng mảnh,
 * cộng vào ánh phát sáng theo màu đồng của vật liệu và độ Fresnel. Không có texture hay bản đồ nào để nạp, tạo hay giải phóng, và không đặt `scene.environment`: chỉ vật liệu nào gọi hàm này mới có ánh kim, mọi vật khác
 * của cảnh giữ nguyên. Mức Thấp không gọi (chỉ màu đồng và ánh kim thấp).
 */
export const COPPER_SHEEN_GLSL = `
{
  vec3 sheenV = normalize(vViewPosition);
  vec3 sheenW = inverseTransformDirection(reflect(-sheenV, normal), viewMatrix);
  float sheenUp = sheenW.y;
  vec3 sheenSky = mix(vec3(0.95, 0.93, 0.85), vec3(0.50, 0.68, 0.92), smoothstep(0.1, 0.9, sheenUp));
  vec3 sheenEnv = mix(vec3(0.10, 0.07, 0.05), sheenSky, smoothstep(-0.25, 0.2, sheenUp));
  float sheenGlint = pow(max(dot(sheenW, normalize(vec3(0.45, 0.8, 0.35))), 0.0), 20.0);
  float sheenFresnel = 0.35 + 0.65 * pow(1.0 - max(dot(normal, sheenV), 0.0), 3.0);
  totalEmissiveRadiance += diffuseColor.rgb * (sheenEnv * 0.55 + sheenGlint * 1.1) * sheenFresnel * uSheen;
}`;

/** Gắn ánh kim giả (cường độ `intensity`) vào vật liệu; mọi vật liệu gọi hàm này dùng chung một chương trình shader (cùng khóa). */
export function attachCopperSheen(material: MeshStandardMaterial, intensity = 1): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSheen = { value: intensity };
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSheen;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>${COPPER_SHEEN_GLSL}`);
  };
  material.customProgramCacheKey = () => 'copper-sheen-v1';
}
