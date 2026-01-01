import { NextRequest, NextResponse } from "next/server";
import { generateEmbeddings, rerankDocuments } from "@/lib/cohere";

// Mock resume database
const resumeDatabase = [
  { id: 1, name: "John Doe", skills: "JavaScript, React, Node.js, TypeScript", experience: "5 years", role: "Full-Stack Developer" },
  { id: 2, name: "Jane Smith", skills: "Python, Django, Machine Learning, AI", experience: "3 years", role: "ML Engineer" },
  { id: 3, name: "Bob Johnson", skills: "Java, Spring Boot, Microservices, AWS", experience: "7 years", role: "Senior Backend Developer" },
  { id: 4, name: "Alice Williams", skills: "React, Vue.js, UI/UX Design, Tailwind CSS", experience: "4 years", role: "Frontend Developer" },
  { id: 5, name: "Charlie Brown", skills: "DevOps, Docker, Kubernetes, CI/CD", experience: "6 years", role: "DevOps Engineer" },
];

export async function POST(request: NextRequest) {
  try {
    const { query, action } = await request.json();

    if (action === "search") {
      // Search resumes using semantic search
      const resumeTexts = resumeDatabase.map(
        r => `${r.name}: ${r.role} with ${r.experience} experience. Skills: ${r.skills}`
      );

      const rankedResults = await rerankDocuments(query, resumeTexts, 5);

      const results = rankedResults.map((result: any) => ({
        ...resumeDatabase[result.index],
        relevanceScore: result.relevance_score,
      }));

      return NextResponse.json({ results });
    }

    if (action === "analyze") {
      // Analyze candidate fit
      const { candidateId } = await request.json();
      const candidate = resumeDatabase.find(r => r.id === candidateId);

      if (!candidate) {
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      // Simple analysis using embeddings similarity
      return NextResponse.json({
        candidate,
        analysis: `Strong match for ${query}. Key strengths: ${candidate.skills.split(",").slice(0, 3).join(", ")}.`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("HR API error:", error);
    return NextResponse.json(
      { error: "Failed to process HR request" },
      { status: 500 }
    );
  }
}
