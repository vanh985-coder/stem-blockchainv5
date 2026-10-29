#!/usr/bin/env bash
# Kiểm migration 0003 (P3b) và RLS trên một PostgreSQL BIỆT LẬP (không phải Supabase thật, không đụng production).
#
# Cần: PostgreSQL 15+ chạy được và một tài khoản tạo/xóa được cơ sở dữ liệu thử. Ví dụ (Docker, máy nào cũng chạy được):
#   docker run --rm -d --name p3b-pg -e POSTGRES_PASSWORD=pw -p 55432:5432 postgres:16
#   PGHOST=localhost PGPORT=55432 PGUSER=postgres PGPASSWORD=pw bash scripts/db-test-p3b.sh
# Hoặc PostgreSQL cài sẵn: PSQL_PREFIX="runuser -u postgres --" bash scripts/db-test-p3b.sh   (tự dùng socket cục bộ)
#
# Làm: tạo cơ sở dữ liệu mới p3b_test → dựng vỏ Supabase tối thiểu (supabase/tests/00_stub_supabase.sql) → áp 0001, 0002 → PHA 1 (trước 0003) → áp 0003 →
# PHA 2 (sau 0003) → áp 0003 lần nữa (idempotent) → in kết quả từng kiểm tra, thoát khác 0 nếu có kiểm tra hỏng. Xóa cơ sở dữ liệu thử khi xong (KEEP_DB=1 để giữ).
# Muốn thử trên Supabase LOCAL thật (supabase start): đã có sẵn auth.* nên bỏ bước dựng vỏ bằng SKIP_STUB=1 và trỏ PGHOST/PGPORT/PGUSER vào Postgres của nó (cổng 54322, user postgres).
set -euo pipefail
DB=${DB:-p3b_test}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PSQL="${PSQL_PREFIX:-} psql -X -q -v ON_ERROR_STOP=1"
run() { $PSQL -d "$DB" "$@"; }
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB"
cleanup() { [ "${KEEP_DB:-}" = 1 ] || $PSQL -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT
[ "${SKIP_STUB:-}" = 1 ] || run -f "$ROOT/supabase/tests/00_stub_supabase.sql"
run -f "$ROOT/supabase/migrations/0001_init.sql"
run -f "$ROOT/supabase/migrations/0002_teacher.sql"
run -f "$ROOT/supabase/tests/10_p3b_before.sql"
run -f "$ROOT/supabase/migrations/0003_auto_complete.sql"
run -f "$ROOT/supabase/tests/20_p3b_after.sql"
run -f "$ROOT/supabase/migrations/0003_auto_complete.sql"   # áp lần hai: phải êm
run -At -c "select 'PASS  ' || phase || ' · ' || name from t.results where ok order by n" -c "select 'FAIL  ' || phase || ' · ' || name || coalesce(' — ' || detail, '') from t.results where not ok order by n"
FAILS=$(run -At -c "select count(*) from t.results where not ok")
TOTAL=$(run -At -c "select count(*) from t.results")
echo "---"
echo "$((TOTAL - FAILS))/$TOTAL kiểm tra đạt"
[ "$FAILS" = 0 ]
