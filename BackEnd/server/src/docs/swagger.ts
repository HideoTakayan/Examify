import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "~/config/enviroment";

const localBase = `http://${env.APP_HOST}:${env.APP_PORT}`;

const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Graduation Project Backend API",
    version: "1.0.0",
    description:
      "Interactive API documentation for auth, users, exam, session, grading, integrity and autosave endpoints.",
  },
  servers: [
    {
      url: `${localBase}/v1`,
      description: "Local API (v1)",
    },
    {
      url: "https://api.exam.local/v1",
      description: "Production API (v1)",
    },
  ],
  tags: [
    { name: "System", description: "Service-level endpoints" },
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Users", description: "User management (admin only)" },
    { name: "Exams", description: "Exam CRUD endpoints" },
    { name: "Questions", description: "Exam question endpoints" },
    { name: "Sessions", description: "Exam session lifecycle" },
    { name: "Grading", description: "Teacher/admin grading endpoints" },
    { name: "Integrity", description: "Exam monitoring + autosave endpoints" },
    { name: "Dashboard", description: "Aggregated dashboard data by role" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["System"],
        summary: "Healthcheck",
        description: "Check service status.",
        servers: [
          { url: localBase, description: "Local root" },
          { url: "https://api.exam.local", description: "Production root" },
        ],
        responses: {
          200: {
            description: "Service is running",
          },
        },
      },
    },

    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register (admin only)",
        description:
          "Create a user account. Requires Bearer JWT with role **admin**. Public self-registration is disabled.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "username", "password", "role"],
                properties: {
                  email: { type: "string", format: "email" },
                  username: { type: "string" },
                  password: { type: "string", format: "password" },
                  role: {
                    type: "string",
                    enum: ["admin", "teacher", "student"],
                  },
                  full_name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Registered successfully" },
          400: { description: "Invalid payload" },
          401: { description: "Missing or invalid token" },
          403: { description: "Forbidden — admin role required" },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: "Authenticate and return JWT token + user payload.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Authenticated" },
          401: { description: "Invalid credentials" },
        },
      },
    },

    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        description: "Requires admin role.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Users returned" },
          403: { description: "Forbidden" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create user",
        description: "Requires admin role.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          201: { description: "User created" },
          403: { description: "Forbidden" },
        },
      },
    },

    "/users/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Users"],
        summary: "Get user by id",
        description: "Requires admin role.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User returned" },
          404: { description: "User not found" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user",
        description: "Requires admin role.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          200: { description: "User updated" },
          404: { description: "User not found" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user",
        description: "Requires admin role.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User deleted" },
          404: { description: "User not found" },
        },
      },
    },

    "/dashboard/ping": {
      get: {
        tags: ["Dashboard"],
        summary: "Dashboard route ping (no auth)",
        description: "Returns 200 if this Node process serves `/v1/dashboard` (useful after deploy / proxy checks).",
        responses: {
          200: { description: "Route reachable" },
        },
      },
    },

    "/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard payload",
        description:
          "Returns role-specific dashboard data. **Student**: stats, upcoming exams (enrolled classes), performance chart, recent results. **Admin / teacher**: metrics, recent students (admin), recent exam sessions.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Dashboard envelope: viewer_role + student or staff branch",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        viewer_role: {
                          type: "string",
                          enum: ["student", "teacher", "admin"],
                        },
                        student: { type: "object", nullable: true },
                        staff: { type: "object", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },

    "/exams": {
      get: {
        tags: ["Exams"],
        summary: "List exams",
        description: "Requires JWT. Allowed roles: admin, teacher, student.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Exams returned" },
        },
      },
      post: {
        tags: ["Exams"],
        summary: "Create exam",
        description: "Requires JWT. Allowed roles: admin, teacher.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          201: { description: "Exam created" },
        },
      },
    },

    "/exams/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Exams"],
        summary: "Get exam by id",
        description: "Requires JWT. Allowed roles: admin, teacher, student.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Exam returned" },
          404: { description: "Exam not found" },
        },
      },
      delete: {
        tags: ["Exams"],
        summary: "Delete exam",
        description: "Requires JWT. Allowed roles: admin, teacher.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Exam deleted" },
          404: { description: "Exam not found" },
        },
      },
    },

    "/exams/{examId}/questions": {
      parameters: [
        {
          name: "examId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Questions"],
        summary: "List questions for an exam",
        description: "Requires JWT. Allowed roles: admin, teacher, student.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Questions returned" },
        },
      },
      post: {
        tags: ["Questions"],
        summary: "Add question",
        description:
          "Requires JWT. Allowed roles: admin, teacher. For MCQ provide options and correct_answer.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content", "points"],
                properties: {
                  content: { type: "string" },
                  points: { type: "number" },
                  question_type: {
                    type: "string",
                    enum: ["mcq", "essay"],
                    default: "mcq",
                  },
                  options: {
                    type: "array",
                    items: { type: "string" },
                  },
                  correct_answer: {
                    oneOf: [
                      { type: "string" },
                      {
                        type: "array",
                        items: { type: "string" },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Question created" },
        },
      },
    },

    "/exams/{examId}/questions/{questionId}": {
      parameters: [
        {
          name: "examId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "questionId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      delete: {
        tags: ["Questions"],
        summary: "Delete question",
        description: "Requires JWT. Allowed roles: admin, teacher.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Question deleted" },
          404: { description: "Question not found" },
        },
      },
    },

    "/exams/{examId}/sessions": {
      parameters: [
        {
          name: "examId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      post: {
        tags: ["Sessions"],
        summary: "Start or get active session",
        description: "Requires JWT. Allowed role: student.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Session returned" },
        },
      },
      get: {
        tags: ["Sessions"],
        summary: "List sessions for exam",
        description: "Requires JWT. Allowed roles: admin, teacher.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Sessions returned" },
        },
      },
    },

    "/exams/sessions/{sessionId}/submit": {
      parameters: [
        {
          name: "sessionId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      post: {
        tags: ["Sessions"],
        summary: "Submit exam session",
        description: "Requires JWT. Allowed role: student.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["answers"],
                properties: {
                  answers: {
                    type: "object",
                    additionalProperties: {
                      oneOf: [
                        { type: "string" },
                        {
                          type: "array",
                          items: { type: "string" },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Submission accepted and graded (auto for objective answers)" },
        },
      },
    },

    "/exams/sessions/me": {
      get: {
        tags: ["Sessions"],
        summary: "Get my session history",
        description: "Requires JWT. Allowed role: student.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Session history returned" },
        },
      },
    },

    "/exams/{examId}/my-submission": {
      parameters: [
        {
          name: "examId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Sessions"],
        summary: "Get my latest submitted attempt for an exam",
        description: "Requires JWT. Allowed role: student.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Latest submission returned" },
          404: { description: "Submission not found" },
        },
      },
    },

    "/exams/sessions/{sessionId}/grading": {
      parameters: [
        {
          name: "sessionId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Grading"],
        summary: "Get grading payload",
        description: "Requires JWT. Allowed roles: admin, teacher.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Grading data returned" },
          404: { description: "Session not found" },
        },
      },
    },

    "/exams/sessions/{sessionId}/grade": {
      parameters: [
        {
          name: "sessionId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      patch: {
        tags: ["Grading"],
        summary: "Manual grade essay answers",
        description: "Requires JWT. Allowed roles: admin, teacher.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["grades"],
                properties: {
                  grades: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      required: ["points_awarded"],
                      properties: {
                        points_awarded: { type: "number" },
                        comment: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Session graded" },
        },
      },
    },

    "/exams/sessions/{sessionId}/review": {
      parameters: [
        {
          name: "sessionId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Sessions"],
        summary: "Review submitted exam session",
        description:
          "Returns full review payload for a student's submitted session: questions, submitted answers, correct answers, explanations, points earned. Requires JWT. Allowed role: student (own session only).",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Review payload with full question details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        session: { type: "object" },
                        exam: { type: "object" },
                        score: { type: "number", nullable: true },
                        max_points: { type: "number", nullable: true },
                        grading_status: { type: "string", nullable: true },
                        questions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              question_id: { type: "string" },
                              question_type: { type: "string" },
                              content: { type: "string" },
                              options: { type: "object", nullable: true },
                              explanation: { type: "string", nullable: true },
                              submitted: { type: "string", nullable: true },
                              correct: { type: "string", nullable: true },
                              is_correct: { type: "boolean" },
                              points_earned: { type: "number", nullable: true },
                              max_points: { type: "number" },
                              pending_grading: { type: "boolean" },
                              teacher_comment: { type: "string", nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Session is still active (not submitted)" },
          403: { description: "Not your session" },
          404: { description: "Session not found" },
        },
      },
    },

    "/exams/integrity-events": {
      post: {
        tags: ["Integrity"],
        summary: "Receive integrity event batch",
        description: "Requires JWT. Allowed role: student.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          200: { description: "Integrity events accepted" },
        },
      },
    },

    "/exams/autosave": {
      post: {
        tags: ["Integrity"],
        summary: "Receive autosave snapshot",
        description: "Requires JWT. Allowed role: student.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          200: { description: "Autosave accepted" },
        },
      },
    },
  },
};

export function setupSwaggerDocs(app: Express): void {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  app.get("/docs-json", (_req, res) => {
    res.json(swaggerSpec);
  });
}
