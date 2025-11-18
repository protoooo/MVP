"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ code: input }),
    });

    if (res.ok) {
      router.push("/"); // Redirect to chat on success
    } else {
      setError("Invalid Access Code");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0f1419] text-white">
      <form onSubmit={handleSubmit} className="p-8 border border-gray-700 rounded-lg text-center">
        <h1 className="text-2xl mb-4 font-bold">Compliance Assistant</h1>
        <p className="mb-4 text-gray-400">Enter your access code to continue</p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-gray-800 border border-gray-600 p-2 rounded w-full mb-4 text-white"
          placeholder="Access Code"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button type="submit" className="bg-green-600 px-4 py-2 rounded w-full hover:bg-green-500 transition">
          Enter
        </button>
      </form>
    </div>
  );
}
