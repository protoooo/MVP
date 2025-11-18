"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

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
      setInput("");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
        
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
          <p className="text-gray-400">Please enter your access code</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Access Code
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 text-white text-lg rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-600"
              placeholder="123456"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-900/50 border border-red-500 text-red-200 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white text-lg font-bold rounded-xl py-4 transition-colors shadow-lg"
          >
            {loading ? "Verifying..." : "Enter App"}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500 text-sm">
          Washtenaw County Compliance Assistant
        </p>
      </div>
    </div>
  );
}
