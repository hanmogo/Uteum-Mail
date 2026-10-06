import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>이 화면을 찾을 수 없어요</h1>
      <p>메뉴에서 체험할 화면을 다시 선택해 주세요.</p>
      <Link href="/today">오늘로 돌아가기</Link>
    </div>
  );
}
