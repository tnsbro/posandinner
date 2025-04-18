import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function NotFoundPage() {

  const navigete = useNavigate();

  useEffect(() => {
    navigete('/');
  }, []); // 컴포넌트가 마운트될 때 홈으로 리디렉션
  return (
    <div className="not-found-page">
      <h1>404 Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}

export default NotFoundPage;