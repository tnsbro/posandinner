import { Button } from "react-bootstrap";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate } from "react-router-dom";

function FinalScreen() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h1 className="mb-4">환영합니다!</h1>
      <p className="mb-4">로그인에 성공하셨습니다.</p>
      <Button variant="danger" onClick={handleLogout}>
        로그아웃
      </Button>
    </div>
  );
}

export default FinalScreen;