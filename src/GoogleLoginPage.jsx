import { GoogleAuthProvider, signInWithRedirect, getAuth } from "firebase/auth";
import { Card, Button, Spinner } from "react-bootstrap";
import { useState } from "react";

function GoogleLoginPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    const auth = getAuth();
    await signInWithRedirect(auth, provider).then((data) => {
      console.log(data);
    }).catch((error) => {
      setError(error.message);
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
      }}
    >
      <Card
        className="text-center p-5 shadow-lg"
        style={{
          borderRadius: "1.5rem",
          minWidth: "320px",
          maxWidth: "400px",
          width: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
        }}
      >
        <h2 className="mb-4 text-dark">환영합니다 👋</h2>
        <p className="mb-4 text-muted">구글 계정으로 빠르게 로그인하세요</p>

        <Button
          onClick={handleLogin}
          variant="light"
          size="lg"
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          style={{
            border: "1px solid #ddd",
            borderRadius: "999px",
            fontWeight: "500",
            padding: "0.75rem 1.25rem",
          }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google Logo"
            style={{ width: "20px" }}
          />
          <span style={{ color: "#555" }}>구글로 로그인</span>
        </Button>

        {error && <p className="mt-3 text-danger small">{error}</p>}
      </Card>
    </div>
  );
}

export default GoogleLoginPage;