/**
 * Đăng ký tập trung 5 bài học của "Sổ Chung".
 * Router và trang chủ đọc trực tiếp từ registry này để đảm bảo không lặp lại cấu hình ở nhiều nơi.
 */

export interface LessonRegistryItem {
  id: number;
  title: string;
  shortTitle: string;
  accent: string;
  darkAccent: string;
  icon: string;
  metaphor: string;
  load: () => Promise<unknown>;
}

export const LESSONS_REGISTRY: readonly LessonRegistryItem[] = [
  {
    id: 1,
    title: 'Bài 1: Khối & chuỗi',
    shortTitle: 'Khối & chuỗi',
    accent: '#1FAF5A', // xanh-dung
    darkAccent: '#178A46',
    icon: 'BookOpen',
    metaphor: 'Trang sổ nối nhau bằng mã trang',
    load: () => import('./lesson1'),
  },
  {
    id: 2,
    title: 'Bài 2: Node',
    shortTitle: 'Node',
    accent: '#2E90E8', // xanh-mang
    darkAccent: '#1F6FB8',
    icon: 'Network',
    metaphor: 'Nhiều bạn cùng giữ một cuốn sổ giống nhau',
    load: () => import('./lesson2'),
  },
  {
    id: 3,
    title: 'Bài 3: Khóa riêng & khóa công khai',
    shortTitle: 'Khóa riêng & khóa công khai',
    accent: '#5B3FD6', // muc-tim
    darkAccent: '#4430A8',
    icon: 'KeyRound',
    metaphor: 'Chữ ký bí mật và con dấu đối chiếu',
    load: () => import('./lesson3'),
  },
  {
    id: 4,
    title: 'Bài 4: Cây Merkle',
    shortTitle: 'Cây Merkle',
    accent: '#FFC21A', // vang-sao
    darkAccent: '#D9A000',
    icon: 'GitFork',
    metaphor: 'Tóm tắt nhiều dòng thành một gốc Merkle duy nhất',
    load: () => import('./lesson4'),
  },
  {
    id: 5,
    title: 'Bài 5: Tấn công 51%',
    shortTitle: 'Tấn công 51%',
    accent: '#E5484D', // but-do
    darkAccent: '#B8363A',
    icon: 'ShieldAlert',
    metaphor: 'Hacker Tí mưu đồ chiếm quá nửa người giữ sổ',
    load: () => import('./lesson5'),
  },
] as const;
