import {
  HealthResponse,
  SourceResponse,
  QuizGenerationRequestPayload,
  QuizGenerationReadyResponse,
  GeneratedQuizResponse,
} from "@/types/api";
import {
  StartAttemptResponse,
  SubmitAttemptRequest,
  AttemptResultResponse,
  QuizListResponse,
  AttemptHistoryResponse,
  QuizUpdateRequest,
} from "@/types/attempt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiClient {
  private static baseUrl = API_BASE_URL.replace(/\/$/, "");

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `API request failed with status: ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error && errorJson.error.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.detail) {
          errorMessage = typeof errorJson.detail === "string"
            ? errorJson.detail
            : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fallback to default message
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  public static async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/api/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return this.handleResponse<HealthResponse>(response);
  }

  public static async createTopicSource(data: {
    topic: string;
    additional_instructions?: string;
    subject?: string;
    exam?: string;
  }): Promise<SourceResponse> {
    const response = await fetch(`${this.baseUrl}/api/sources/topic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<SourceResponse>(response);
  }

  public static async createTextSource(data: {
    text: string;
    title?: string;
    additional_instructions?: string;
  }): Promise<SourceResponse> {
    const response = await fetch(`${this.baseUrl}/api/sources/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<SourceResponse>(response);
  }

  public static async uploadPDFSource(file: File): Promise<SourceResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/api/sources/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });
    return this.handleResponse<SourceResponse>(response);
  }

  public static async getSource(sourceId: string): Promise<SourceResponse> {
    const response = await fetch(`${this.baseUrl}/api/sources/${encodeURIComponent(sourceId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return this.handleResponse<SourceResponse>(response);
  }

  public static async validateQuizGenerationRequest(
    payload: QuizGenerationRequestPayload
  ): Promise<QuizGenerationReadyResponse> {
    const response = await fetch(`${this.baseUrl}/api/quiz/validate-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<QuizGenerationReadyResponse>(response);
  }

  public static async generateQuiz(
    payload: QuizGenerationRequestPayload
  ): Promise<GeneratedQuizResponse> {
    const response = await fetch(`${this.baseUrl}/api/quizzes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<GeneratedQuizResponse>(response);
  }

  public static async saveQuizDraft(payload: any): Promise<GeneratedQuizResponse> {
    const response = await fetch(`${this.baseUrl}/api/quizzes/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<GeneratedQuizResponse>(response);
  }

  public static async getQuiz(quizId: string): Promise<GeneratedQuizResponse> {
    const response = await fetch(`${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return this.handleResponse<GeneratedQuizResponse>(response);
  }

  public static async startQuizAttempt(
    quizId: string,
    participantName?: string
  ): Promise<StartAttemptResponse> {
    const response = await fetch(`${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ participant_name: participantName }),
    });
    return this.handleResponse<StartAttemptResponse>(response);
  }

  public static async submitQuizAttempt(
    quizId: string,
    attemptId: string,
    payload: SubmitAttemptRequest
  ): Promise<AttemptResultResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    return this.handleResponse<AttemptResultResponse>(response);
  }

  public static async getQuizAttemptResults(
    quizId: string,
    attemptId: string
  ): Promise<AttemptResultResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/results`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      }
    );
    return this.handleResponse<AttemptResultResponse>(response);
  }

  public static async listQuizzes(params?: {
    search?: string;
    difficulty?: string;
    source_type?: string;
    limit?: number;
    skip?: number;
  }): Promise<QuizListResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.difficulty && params.difficulty !== "all") query.append("difficulty", params.difficulty);
    if (params?.source_type && params.source_type !== "all") query.append("source_type", params.source_type);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.skip) query.append("skip", params.skip.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const response = await fetch(`${this.baseUrl}/api/quizzes${queryString}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return this.handleResponse<QuizListResponse>(response);
  }

  public static async updateQuiz(
    quizId: string,
    payload: QuizUpdateRequest
  ): Promise<GeneratedQuizResponse> {
    const response = await fetch(`${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<GeneratedQuizResponse>(response);
  }

  public static async deleteQuiz(
    quizId: string
  ): Promise<{ success: boolean; message: string; quiz_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return this.handleResponse<{ success: boolean; message: string; quiz_id: string }>(response);
  }

  public static async getQuizAttemptsHistory(
    quizId: string
  ): Promise<AttemptHistoryResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}/attempts`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
    return this.handleResponse<AttemptHistoryResponse>(response);
  }

  public static async deleteSource(
    sourceId: string
  ): Promise<{ success: boolean; message: string; source_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/sources/${encodeURIComponent(sourceId)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return this.handleResponse<{ success: boolean; message: string; source_id: string }>(response);
  }

  public static getQuizExportUrl(
    quizId: string,
    type: "questions" | "answer_key" = "questions",
    format: "markdown" | "txt" = "markdown"
  ): string {
    return `${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}/export?type=${type}&format=${format}`;
  }

  public static getAttemptExportUrl(
    quizId: string,
    attemptId: string,
    format: "markdown" | "txt" = "markdown"
  ): string {
    return `${this.baseUrl}/api/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}/export?format=${format}`;
  }

  public static async exportQuiz(
    quizId: string,
    type: "questions" | "answer_key" = "questions",
    format: "markdown" | "txt" = "markdown"
  ): Promise<string> {
    const url = this.getQuizExportUrl(quizId, type, format);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Export failed with HTTP status ${response.status}`);
    }
    return response.text();
  }

  public static async exportAttempt(
    quizId: string,
    attemptId: string,
    format: "markdown" | "txt" = "markdown"
  ): Promise<string> {
    const url = this.getAttemptExportUrl(quizId, attemptId, format);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Attempt export failed with HTTP status ${response.status}`);
    }
    return response.text();
  }

  public static getBaseUrl(): string {
    return this.baseUrl;
  }
}

