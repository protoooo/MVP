"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ code: input }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Invalid Access Code");
      setLoading(false);
    }
  };

  // Inline styles to guarantee it looks good regardless of Tailwind issues
  const styles = {
    container: {
      minHeight: "100vh",
      width: "100%",
      backgroundColor: "#111827", // Dark Gray
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "sans-serif",
    },
    card: {
      width: "100%",
      maxWidth: "400px",
      backgroundColor: "#1F2937", // Lighter Gray
      borderRadius: "16px",
      padding: "40px",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
      border: "1px solid #374151",
      textAlign: "center",
    },
    icon: {
      width: "60px",
      height: "60px",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      color: "#10B981",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      margin: "0 auto 20px auto",
    },
    title: { color: "white", fontSize: "24px", fontWeight: "bold", marginBottom: "8px" },
    subtitle: { color: "#9CA3AF", fontSize: "14px", marginBottom: "30px" },
    input: {
      width: "100%",
      backgroundColor: "#111827",
      border: "1px solid #4B5563",
      color: "white",
      padding: "14px",
      borderRadius: "10px",
      fontSize: "16px",
      outline: "none",
      marginBottom: "20px",
    },
    button: {
      width: "100%",
      backgroundColor: "#10B981", // Green
      color: "white",
      padding: "14px",
      borderRadius: "10px",
      fontSize: "16px",
      fontWeight: "bold",
      border: "none",
      cursor: "pointer",
      opacity: loading ? 0.7 : 1,
    },
    error: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      color: "#FCA5A5",
      padding: "10px",
      borderRadius: "8px",
      marginBottom: "20px",
      fontSize: "14px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🔒</div>
        <h1 style={styles.title}>Welcome</h1>
        <p style={styles.subtitle}>Enter your access code to continue</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.input}
            placeholder="••••••"
            autoFocus
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Verifying..." : "Enter App"}
          </button>
        </form>
      </div>
    </div>
  );
}
