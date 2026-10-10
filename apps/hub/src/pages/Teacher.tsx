import { Link, Navigate, useParams } from 'react-router';
import { NenTrangTri, PAGE_THEME, canSeeTeacherPage, useAuth } from '@so-chung/core';
import { teacherTexts } from '@so-chung/core/content/teacher';
import { ClassList } from './teacher/ClassList';
import { ClassView } from './teacher/ClassView';

/**
 * Trang giáo viên /giao-vien (danh sách lớp) và /giao-vien/:classId (một lớp), spec 09.
 * Chưa đăng nhập, là học sinh, hoặc chưa đọc xong hồ sơ thì không vào được: về trang chủ.
 * Dữ liệu do RLS và các hàm Postgres giới hạn: giáo viên chỉ thấy lớp và học sinh của mình, không thấy email.
 */
export default function Teacher() {
  const { classId } = useParams();
  const { loading, profileLoading, session, profile } = useAuth();
  if (loading || (session && profileLoading)) return <p className="p-6">{teacherTexts.dangTai}</p>;
  if (!session || !canSeeTeacherPage(profile?.role)) return <Navigate to="/" replace />;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-5 p-4 sm:p-6">
      {/* Nền rất nhẹ: icon đứng yên, độ mờ thấp, không chuyển động (dữ liệu là chính) */}
      <NenTrangTri theme={PAGE_THEME.giaoVien} variant="still" />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{teacherTexts.tieuDe}</h1>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-nut px-2 text-base font-semibold underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
        >
          {teacherTexts.veTrangChu}
        </Link>
      </header>
      {classId ? <ClassView classId={classId} /> : <ClassList teacherId={profile?.role === 'admin' ? null : session.user.id} />}
    </main>
  );
}
